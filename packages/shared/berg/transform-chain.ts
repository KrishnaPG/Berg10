type MaybePromise<T> = T | Promise<T>;

export type StepFn<I, O> = (input: I) => MaybePromise<O> | undefined;

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
};
export type StepOrFn<I, O> = Step<I, O> | StepFn<I, O>;

/** A tuple of Steps. Used to infer the stream input/output types. */
export type StepChain = readonly StepOrFn<any, any>[];

/*  true left-fold:  [A→B, B→C, C→D]  ok   ;  [A→B, C→D]  error  */
type ValidateChain<T> =
  T extends readonly [infer A, infer B, ...infer Rest]
    ? A extends StepOrFn<infer I, infer O>
      ? B extends StepOrFn<O, infer P>
        ? [A, ...ValidateChain<[B, ...Rest]>]
        : never
      : never
    : T;

/** Helpers to infer input/output of a step/function */
export type InputOf<T> =
  T extends StepFn<infer I, any> ? I :
  T extends Step<infer I, any> ? I :
  never;

export type OutputOf<T> =
  T extends StepFn<any, infer O> ? ReturnType<StepFn<any, O>> :
  T extends Step<any, infer O> ? ReturnType<Step<any, O>["transform"]> :
  never;

/* Helpers to infer types of the chain */
//type FirstInput<T extends StepChain> = T extends [Step<infer I, unknown>, ...unknown[]] ? I : never;

// type LastOutput<T extends StepChain> = T extends [...unknown[], Step<unknown, infer O>] ? O : never;

type FirstElemOf<T extends StepChain> = T extends [StepOrFn<infer I, infer O>, ...unknown[]] ? StepOrFn<I, O> : never
type LastElemOf<T extends StepChain> = T extends [...unknown[], StepOrFn<infer I, infer O>] ? StepOrFn<I, O>: never;

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
): Promise<LastOutput<T> | undefined> {
  let v: unknown = value;
  for (let i = fromIndex; i < steps.length; i++) {
    if (v === undefined) return undefined;
    v = await runStep(steps[i], v);
  }
  return v as LastOutput<T> | undefined;
}


export function runStep<I, O>(s: StepOrFn<I, O>, v: I): OutputOf<StepOrFn<I,O>> {
  return typeof s === "function" ? s(v) : s.transform(v);
}

export function flushStep<I, O>(s: StepOrFn<I, O>): OutputOf<StepOrFn<I,O>> {
  return (s as Step<I,O>).flush?.();
}

/**
 * Build a TransformStream that implements the whole chain in one (async) transform.
 * - input type is FirstInput<T>
 * - output type is LastOutput<T>
 *
 * This is safe, type-checked, and supports async steps + flush propagation.
 */
export function chainTransform<Chain extends StepChain>(
  steps:ValidateChain<Chain>,
): TransformStream<FirstInput<Chain>, LastOutput<Chain>> 
{
  return new TransformStream<FirstInput<Chain>, LastOutput<Chain>>({
    async transform(chunk, controller) {
      // Run the entire chain on this chunk, enqueue final value(s).
      const res = await runAllSteps(steps, chunk);
      if (res !== undefined) {
        controller.enqueue(res);
      }
    },

    async flush(controller) {
      // For each step that has flush(), call it and propagate its result
      // through the remaining steps (i+1 .. end), then enqueue the final value.
      for (let i = 0; i < steps.length; ++i) {
        const step = steps[i];
        const flushed = await flushStep(step);
        if (flushed === undefined) continue;

        // Propagate flushed value through downstream steps
        const final = await runStepsFrom(steps, i + 1, flushed);
        if (final !== undefined) {
          controller.enqueue(final);
        }
      }
    },
  });
}

/* Convenience wrapper: allow a plain function to be used as a Step */
export function stepFn<I, O>(fn: Step<I, O>["transform"]): Step<I, O> {
  return { transform: fn };
}

// Helpers to normalize Step into StepFn object
export function toStep<I, O>(s: StepOrFn<I, O>): Step<I, O> {
  return typeof s === "function" ? { transform: s } : s;
}

export function toStepChain<Chain extends StepChain>(
  steps: [...Chain]
): ValidateChain<{ [K in keyof Chain]: Chain[K] extends StepOrFn<infer I, infer O> ? Step<I,O> : never }> {
  return steps.map(toStep) as any;
}

/**
 * Usage examples
    const s1: Step<string, number> = { transform: (x) => x.length };
    const s2: Step<number, boolean> = { transform: (n) => n > 5 };

    const good = chainTransform([s1, s2, (x: boolean) => Number(x)); // ok

    const s3: Step<string, number> = { transform: (x) => x.length };
    const s4: Step<boolean, string> = { transform: (b) => (b ? "yes" : "no") };

    const bad = chainTransform([s3, s4]); //<- Typescript error will come here
 */
