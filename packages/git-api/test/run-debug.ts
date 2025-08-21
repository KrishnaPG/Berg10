/**
 * Simple script to run the debug driver
 * Run with: bun run test/run-debug.ts
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runDebug() {
  try {
    console.log('Running debug driver...');
    const { stdout, stderr } = await execAsync('bun run test/debug-driver.ts');
    
    if (stdout) {
      console.log('Output:');
      console.log(stdout);
    }
    
    if (stderr) {
      console.error('Errors:');
      console.error(stderr);
    }
  } catch (error) {
    console.error('Failed to run debug driver:', error);
  }
}

runDebug();