type MaybePromise<T> = T | Promise<T>;

export const DROP = Symbol("drop");
export type GenStepFn<I, O> = (input: I) => AsyncGenerator<O, void, unknown>; // allows to expand one chunk into 0..n chunks

export type StepFn<I, O> = 
  | ((input: I) => MaybePromise<O | typeof DROP>) // sync or async methods
  | GenStepFn<I, O> // generator method

/**
 * A single step in the chain.
 * - transform: called per value; may return undefined to drop the item.
 * - flush: optional; called at stream flush time to emit a final value (or nothing).
 *
 * IMPORTANT: transform/flush return type O is treated as a single value and
 * passed to the next step unchanged. We do NOT implicitly flatten arrays.
 */
export type Step<I, O> = {
  transform: StepFn<I, O>;
  flush?: () => ReturnType<StepFn<I, O>>;
  name?: string; // for debug purposes
};
export type StepOrFn<I, O> = Step<I, O> | StepFn<I, O>;

/** A tuple of Steps. Used to infer the stream input/output types. */
export type StepOrFnChain = readonly StepOrFn<any, any>[];
export type StepChain = readonly Step<any, any>[];

/** Helpers to infer input/output of a step/function */
export type InputOf<T> = T extends StepFn<infer I, any> ? I : T extends Step<infer I, any> ? I : never;

export type OutputOf<T> = T extends StepFn<any, infer O>
  ? ReturnType<StepFn<any, O>>
  : T extends Step<any, infer O>
    ? ReturnType<Step<any, O>["transform"]>
    : never;

/* Helpers to infer types of the chain */
type FirstElemOf<T extends StepChain> = T extends [Step<infer I, infer O>, ...unknown[]] ? Step<I, O> : never;
type LastElemOf<T extends StepChain> = T extends [...unknown[], Step<infer I, infer O>] ? Step<I, O> : never;

type FirstInput<T extends StepChain> = InputOf<FirstElemOf<T>>;
type LastOutput<T extends StepChain> = OutputOf<LastElemOf<T>>;

/**
 * Run the whole chain (all steps) on a single input value,
 * returning the final value (or undefined = dropped).
 *
 * Use this when you want to inline the chain inside any TransformStream.
 */
export function runAllSteps<T extends StepChain>(steps: T, input: FirstInput<T>): Promise<LastOutput<T> | undefined> {
  return runStepsFrom(steps, 0, input);
}

/**
 * Run the chain starting from 'fromIndex' (exclusive of earlier steps).
 * Used for flush propagation: when step[i].flush() produces a value,
 * we feed it into subsequent steps (i+1 .. end).
 */
export async function runStepsFrom<T extends StepChain>(
  steps: T,
  fromIndex: number,
  value: unknown,
): Promise<LastOutput<T>> {
  let v: unknown = value;
  for (let i = fromIndex; i < steps.length; i++) {
    if (v === DROP) return v as LastOutput<T>;
    v = await steps[i].transform(v);
  }
  return v as LastOutput<T>;
}

export function runStep<I, O>(s: StepOrFn<I, O>, v: I): OutputOf<StepOrFn<I, O>> {
  return typeof s === "function" ? s(v) : s.transform(v);
}

/**
 * Run a single step.  Returns:
 * - DROP symbol  → drop this chunk
 * - O            → single value (legacy)
 * - AsyncGenerator → expand to 0..n values
 */
export async function* runStepIterable<I, O>(
  s: Step<I, O>,
  v: I
): AsyncGenerator<O, void, unknown> {
  const res = s.transform(v);

  // generator branch
  if (res && typeof res === 'object' && Symbol.asyncIterator in res) {
    yield* res as AsyncGenerator<O, void, unknown>;
    return;
  }

  // classic single value (may be a promise)
  const awaited = await res;
  if (awaited !== DROP) yield awaited as O;
}

/**
 * Build a TransformStream that implements the whole chain in one (async) transform.
 * - input type is FirstInput<T>
 * - output type is LastOutput<T>
 *
 * This is safe, type-checked, and supports async steps + flush propagation.
 */
export function chainTransform<Chain extends StepOrFnChain>(
  chain: ValidateChain<Chain>,
): TransformStream<FirstInput<AsStepChain<Chain>>, LastOutput<AsStepChain<Chain>>> {
  // normalize the input
  const steps = toStepChain(chain);

  return new TransformStream<FirstInput<AsStepChain<Chain>>, LastOutput<AsStepChain<Chain>>>({
    async transform(chunk, controller) {
      // Run the entire chain on this chunk, enqueue final value(s).
      const res = await runAllSteps(steps, chunk);
      if (res !== DROP) {
        controller.enqueue(res);
      }
    },

    async flush(controller) {
      try {
        // For each step that has flush(), call it and propagate its result
        // through the remaining steps (i+1 .. end), then enqueue the final value.
        for (let i = 0; i < steps.length; ++i) {
          const step = steps[i];
          if(!step.flush) continue;
          const flushed = await step.flush();
          if (flushed === DROP) continue;

          // Propagate flushed value through downstream steps
          const final = await runStepsFrom(steps, i + 1, flushed);
          if (final !== DROP) controller.enqueue(final);
        }
      } catch (err) {
        controller.error(err);
      }
    },
  });
}

// Helpers to normalize Step into StepFn object
export function toStep<I, O>(s: StepOrFn<I, O>): Step<I, O> {
  return typeof s === "function" ? { transform: s, name: s.name || 'anonymous' } : s;
}

export function toStepChain<Chain extends StepOrFnChain>(steps: Chain): AsStepChain<Chain> {
  return steps.map(toStep) as any;
}

/** type transform from StepFnChain -> StepChain */
type AsStepChain<Chain extends StepOrFnChain> = ValidateChain<{
  [K in keyof Chain]: Chain[K] extends StepOrFn<infer I, infer O> ? Step<I, O> : never;
}>;

/*  true left-fold:  [A→B, B→C, C→D]  ok   ;  [A→B, C→D]  error  */
type ValidateChain<T> = T extends readonly [infer A, infer B, ...infer Rest]
  ? A extends StepOrFn<infer I, infer O>
    ? B extends StepOrFn<O, infer P>
      ? [A, ...ValidateChain<[B, ...Rest]>]
      : never
    : never
  : T;


/** 
 * Method composer, gives you a re-usable function that hides the whole pipeline.
 * 
 * Always returns a promise. For sync versions, use `pipe`;
 * 
 * @example
    const lenThenGt5 = compose([
      (s: string) => s.length,
      (n: number) => n > 10 ? DROP : n      // drop big numbers
    ]);

    const res = await lenThenGt5('hello');   // 5
  */
export function compose<Chain extends StepOrFnChain>(chain: ValidateChain<Chain>) {
  const steps = toStepChain(chain);
  return (input: FirstInput<AsStepChain<Chain>>) =>
    runAllSteps(steps, input) as Promise<LastOutput<AsStepChain<Chain>> | typeof DROP>;
}

/**
 * binary pipe;  a |> b  ===  pipe(a,b);
 * 
 * `pipe` is the inline, expression-level counterpart of `compose` with no intermediate variable, 
 * no await wrapper, and it works for sync one-liners inside ordinary expressions;
 * 
 * `pipe` is DX sugar for quick scripts, not a replacement for the fully type-safe `compose`.
 * 
 * @example
    const out = pipe(
        'hello',
        s => s.length,
        n => n * 2
      ); // 10
 * @example
    const discount = pipe(
      cart.items,
      items => items.filter(i => i.inStock),
      items => items.reduce((s, i) => s + i.price, 0),
      total => total * 0.9
    );
 */
export function pipe<A, B>(a: A, fn: (x: A) => B): B;
export function pipe<A, B, C>(a: A, fn1: (x: A) => B, fn2: (x: B) => C): C;
export function pipe(a: any, ...fns: Array<(x: any) => any>) {
  return fns.reduce((v, fn) => fn(v), a);
}

/**
 * Usage examples
  const s1: Step<string, number> = { transform: (x) => x.length };
  const s2: Step<number, boolean> = { transform: (n) => n > 5 };

  const good = chainTransform([s1, s2, (x: boolean) => Number(x), (y: number) => y > 10]); // ok

  const s3: Step<string, number> = { transform: (x) => x.length };
  const s4: Step<boolean, string> = { transform: (b) => (b ? "yes" : "no") };

  const bad = chainTransform([s3, s4]); //<- Typescript error will come here

  const lenThenGt5 = compose([
    (s: string) => s.length,
    (n: number) => n > 10 ? DROP : n      // drop big numbers
  ]);

  const res = await lenThenGt5('hello');   // 5
*/
