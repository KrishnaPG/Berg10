import { Transform } from "stream";

/**
 * Build a TransformStream<Uint8Array, string[]>
 * Back-pressure is managed by the stream itself: when the downstream
 * queue is full, the TransformStream will stop reading, which stops
 * the underlying ReadableStream, which stops the git process.
 * 
 * @example
 * ```ts
    await git(["rev-list", …])
      .stdout
      .pipeThrough(linesBatchedTransform(500))
      .pipeTo(new WritableStream<string[]>({
        async write(batch) {
          for (const raw of batch) {
            const line = raw.trim();
            … // your logic
          }
        },
      })); 
 * ```
 */
export function linesBatchedTransform(_maxLines?: number): Transform {
  const maxLines = _maxLines ?? 1000;

  const dec = new TextDecoder();
  let buf = "";
  const pending: string[] = [];

  return new Transform({
    readableObjectMode: true,
    writableObjectMode: false,
    highWaterMark: 256,

    transform(chunk: Buffer, _encoding, callback) {
      buf += dec.decode(chunk, { stream: true });

      let eol: number;
      while ((eol = buf.indexOf("\n")) >= 0) {
        pending.push(buf.slice(0, eol));
        buf = buf.slice(eol + 1);

        if (pending.length >= maxLines) {
          this.push(pending);
          pending.length = 0;
        }
      }
      callback();
    },

    flush(callback) {
      if (buf.length) pending.push(buf);
      if (pending.length) this.push(pending);
      callback();
    },
  });
}
