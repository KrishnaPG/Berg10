import type { TFilePath, TSQLString } from "@shared/types";
import { chainTransform, type Step } from "./transform-chain";

export type IOType = TFilePath | TSQLString | void;

export interface StepContext<I, O> {
  inType: I;
  outType: O;
  taskId: string;
  stepId: string; // same as taskId
}

const stepRegistry: Record<
  string,
  {
    ptrs: { in: IOType; out: IOType };
    fn: (ctx: StepContext<any, any>) => Promise<void>;
  }
> = {};

// export function ReliableStep<I,O>(
//   name: string,
//   ptrs: { in: Pointer<I>; out: Pointer<O> },
//   fn:   (ctx: StepContext<I,O>) => Promise<void>
// ): Step<I,O> {
//   stepRegistry[name] = { ptrs, fn };
//   return {
//     name,
//     transform: (input: I) => engine.schedule(name, input), // internal
//   } as Step<I,O>;   // cast safe – engine will override
// }

const s1: Step<string, number> = { transform: (x) => x.length };
const s2: Step<number, boolean> = { transform: (n) => n > 5 };

const good = chainTransform([s1, s2, (x: boolean) => Number(x), (y: number) => y > 10]); // ok

export function ReliableStep<I, O>(fn: (_x: I) => O) {
  return { name: "something", transform: (input: I) => engine.execute({ runId, input }) };
}

class Engine {
  constructor(protected runId: string) {
    this.runId = Math.random().toString(36);
  }
  execute(input, stepId, cb: (ctx) => void) {
    // 1. insert into DB { stepId, status: "running", input, started_at: Date.now(), runId }
    return cb({ input, stepId, runId })
      .then((output) => {
        // 2. save to DB {stepId, status: "done", output, modified_at: Date.now()}
        return output;
      })
      .catch((ex) => {
        // 3. save to DB (stepId, status: "failed", error, modified_at: Date.now());
        throw ex;
      });
  }
}

// when resuming, create a sliced chain and execute it (from that step onwards)
// read from DB what is the last entry and start from there

const step1 = ReliableStep(
  "uppercase",
  { in: file("in.txt"), out: file("tmp/upper.txt") },
  async ({ inPtr, outPtr }) => {
    const txt = await Bun.file((inPtr as any).path).text();
    await Bun.write((outPtr as any).path, txt.toUpperCase());
  },
);

const step2 = ReliableStep(
  "reverse",
  { in: file("tmp/upper.txt"), out: file("out.txt") },
  async ({ inPtr, outPtr }) => {
    const txt = await Bun.file((inPtr as any).path).text();
    await Bun.write((outPtr as any).path, txt.split("").reverse().join(""));
  },
);
