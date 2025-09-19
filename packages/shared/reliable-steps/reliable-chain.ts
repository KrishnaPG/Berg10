import type { TFilePath, TName, TSQLString } from "@shared/types";
import { getRandomId } from "@shared/utils";
import { chainTransform, type Step, type StepFn, StepOrFnChain } from "./transform-chain";

export type IOType = TFilePath | TSQLString | void;

export interface IStepContext<I, O> {
  name: string;
  input: I;
  stepId: number;
  cb: (_: I) => O;
}

class ReliableExecutor {
  constructor(protected runId: string) {}
  async runStep<I, O>(ctx: IStepContext<I, O>) {
    try {
      const output: O = await ctx.cb(ctx.input);
      // TODO: insert into DB { runId, stepId, status: "done", input, output, started_at: Date.now() }
      return output;
    } catch (ex) {
      // TODO: insert to DB { runId, stepId, status: "failed", input, error, modified_at: Date.now())}
      throw new Error(
        `Step ${ctx.stepId + 1} "${ctx.name}" Failed for runId: ${this.runId}; ${(ex as Error).message}`,
        { cause: ex },
      );
    }
  }
}

export function ReliableStep<I, O>(name: string, cb: (_x: I) => O, exec: ReliableExecutor): StepFn<I, O> {
  return (input: I, stepId: number) => exec.runStep({ name, input, stepId, cb });
}
