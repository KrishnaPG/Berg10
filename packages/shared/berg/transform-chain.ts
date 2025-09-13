type MaybePromise<T> = T | Promise<T>;

/**
 * A single step in the chain.
 * - transform: called per value; may return undefined to drop the item.
 * - flush: optional; called at stream flush time to emit a final value (or nothing).
 *
 * IMPORTANT: transform/flush return type O is treated as a single value and
 * passed to the next step unchanged. We do NOT implicitly flatten arrays.
 */
export type Step<I, O> = {
  transform: (input: I) => MaybePromise<O | undefined>;
  flush?: () => MaybePromise<O | undefined>;
};

/** A tuple of Steps. Used to infer the stream input/output types. */
export type StepChain = readonly Step<any, any>[];

/*  true left-fold:  [A→B, B→C, C→D]  ok   ;  [A→B, C→D]  error  */
type ValidateChain<T> =
  // biome-ignore lint/suspicious/noRedeclare: O should be same for Step1 and Step2
  T extends readonly [Step<infer I, infer O>, Step<infer O, infer P>, ...infer Rest]
    ? Rest extends []
      ? T
      : readonly [Step<I, O>, ...ValidateChain<readonly [Step<O, P>, ...Rest]>]
    : T extends readonly [Step<any, any>] // single step – always ok
      ? T
      : never;

/* Helpers to infer types of the chain */
type FirstInput<T extends StepChain> = T extends [Step<infer I, unknown>, ...unknown[]] ? I : never;

type LastOutput<T extends StepChain> = T extends [...unknown[], Step<unknown, infer O>] ? O : never;

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
    v = await (steps[i] as Step<unknown, unknown>).transform(v);
  }
  return v as LastOutput<T> | undefined;
}

/**
 * Build a TransformStream that implements the whole chain in one (async) transform.
 * - input type is FirstInput<T>
 * - output type is LastOutput<T>
 *
 * This is safe, type-checked, and supports async steps + flush propagation.
 */
export function chainTransform<T extends StepChain>(
  steps: ValidateChain<T>,
): TransformStream<FirstInput<T>, LastOutput<T>> {
  return new TransformStream<FirstInput<T>, LastOutput<T>>({
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
        if (!step.flush) continue;
        const flushed = await step.flush();
        if (flushed === undefined) continue;

        // Propagate flushed value through downstream steps
        const final = await runStepsFrom(steps, i + 1, flushed);
        if (final !== undefined) {
          controller.enqueue(final as LastOutput<T>);
        }
      }
    },
  });
}

/* Convenience wrapper: allow a plain function to be used as a Step */
export function stepFn<I, O>(fn: Step<I, O>["transform"]): Step<I, O> {
  return { transform: fn };
}

// Convenience: allow shortcut where user supplies just the transform function
export type StepOrFn<I, O> = Step<I, O> | Step<I, O>["transform"];

// Helpers to normalize Step into StepFn object
export function normalizeStep<I, O>(s: StepOrFn<I, O>): Step<I, O> {
  return typeof s === "function" ? { transform: s } : s;
}

export function normalize<const T extends readonly StepOrFn<unknown, unknown>[]>(steps: T): StepChain {
  return steps.map(normalizeStep);
}

/**
 * Usage examples:
    const s1: Step<string, number> = { transform: (x) => x.length };
    const s2: Step<number, boolean> = { transform: (n) => n > 5 };

    const good = chainTransform([s1, s2]); // ok

    const s3: Step<string, number> = { transform: (x) => x.length };
    const s4: Step<boolean, string> = { transform: (b) => (b ? "yes" : "no") };

    const bad = chainTransform([s3, s4]); //<- Typescript error will come here
 */

