import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vitePath = path.join(projectDirectory, 'node_modules', 'vite', 'bin', 'vite.js');
const children = [
  spawn(process.execPath, ['--watch', '--watch-preserve-output', 'server/index.mjs'], {
    cwd: projectDirectory,
    stdio: 'inherit',
  }),
  spawn(process.execPath, [vitePath, '--port=3000', '--host=0.0.0.0'], {
    cwd: projectDirectory,
    stdio: 'inherit',
  }),
];

let closing = false;
const close = () => {
  if (closing) return;
  closing = true;
  children.forEach((child) => child.kill());
};

children.forEach((child) => {
  child.on('exit', (code) => {
    if (!closing) {
      close();
      process.exitCode = code ?? 1;
    }
  });
});
process.on('SIGINT', close);
process.on('SIGTERM', close);
