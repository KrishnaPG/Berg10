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
export function linesBatchedTransform(
  _maxLines?: number,
): TransformStream<Uint8Array, string[]> {
  const maxLines = _maxLines ?? 1000;

  const dec = new TextDecoder();
  let buf = "";
  let pending: string[] = [];

  const flush = (controller: TransformStreamDefaultController<string[]>) => {
    if (pending.length) {
      controller.enqueue(pending);
      pending = [];
    }
  };

  return new TransformStream<Uint8Array, string[]>({
    transform(chunk, controller) {
      buf += dec.decode(chunk, { stream: true });

      let eol: number;
      while ((eol = buf.indexOf("\n")) >= 0) {
        pending.push(buf.slice(0, eol));
        buf = buf.slice(eol + 1);

        if (pending.length >= maxLines) flush(controller);
      }
    },

    flush(controller) {
      if (buf.length) pending.push(buf);
      flush(controller);
    },
  });
}