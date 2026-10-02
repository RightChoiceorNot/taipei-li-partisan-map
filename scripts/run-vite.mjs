import { existsSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';

const projectRoot = realpathSync(join(dirname(fileURLToPath(import.meta.url)), '..'));
const command = process.argv[2];
if (!['dev', 'build', 'preview'].includes(command)) process.exit(2);

let workdir = projectRoot;
let mappedDrive = null;
let createdMapping = false;

// Vite treats # as a URL fragment on Windows. The repository lives below
// "#My Project", so expose the same directory through a temporary drive.
if (process.platform === 'win32' && projectRoot.includes('#')) {
  const mappings = spawnSync('subst.exe', [], { encoding: 'utf8' }).stdout ?? '';
  const escapedRoot = projectRoot.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const existing = mappings.match(new RegExp(`^([A-Z]:)\\\\: => ${escapedRoot}$`, 'im'));
  if (existing) mappedDrive = existing[1];
  else {
    const letter = ['Z', 'Y', 'X', 'W', 'V', 'U', 'T'].find((candidate) => !existsSync(`${candidate}:\\`));
    if (!letter) throw new Error('No free temporary drive letter is available for Vite.');
    mappedDrive = `${letter}:`;
    const result = spawnSync('subst.exe', [mappedDrive, projectRoot], { stdio: 'inherit' });
    if (result.status !== 0) process.exit(result.status ?? 2);
    createdMapping = true;
  }
  workdir = `${mappedDrive}\\`;
}

const cli = join(workdir, 'node_modules', 'vite', 'bin', 'vite.js');
const args = command === 'dev'
  ? ['--host', '127.0.0.1', '--port', '5173']
  : [command];
const child = spawn(process.execPath, [cli, ...args], { cwd: workdir, stdio: 'inherit', shell: false, env: process.env });

function cleanup() {
  if (createdMapping && mappedDrive) spawnSync('subst.exe', [mappedDrive, '/d'], { stdio: 'ignore' });
}

child.on('exit', (code, signal) => {
  cleanup();
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    cleanup();
    if (!child.killed) child.kill(signal);
    process.exit(signal === 'SIGINT' ? 130 : 143);
  });
}
process.on('exit', cleanup);
