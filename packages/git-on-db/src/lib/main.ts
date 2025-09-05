import { parseArgs } from 'node:util';
import { runOnce } from './coordinator';

const { values } = parseArgs({
  options: {
    repo: { type: 'string', default: process.cwd() },
    config: { type: 'string' },
    once: { type: 'boolean', default: true },
  },
});

(async () => {
  try {
    await runOnce(values.repo!, values.config);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();