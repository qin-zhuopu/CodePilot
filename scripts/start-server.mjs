// Starts `next start` (production server) but, before doing so, checks whether
// a stale server from THIS project is already occupying the requested port and,
// if so, restarts it (kills the old process, then spawns a fresh one).
//
// It deliberately refuses to kill processes that are NOT this project's own
// `next start` — a foreign process on the same port is reported and we exit so
// the user can decide instead of silently killing someone else's work.
//
// Bind port comes from `$PORT` (default 3000), matching `next start` behaviour.

import { spawn, execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { platform } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const PORT = process.env.PORT || '3000';
const IS_WINDOWS = platform() === 'win32';

// Absolute, normalized project directory, e.g.
//   C:\home\14409.JEREH\repo\github.com\qin-zhuopu\CodePilot
// (the script lives in <project>/scripts/, so step up one level).
const projectDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
// The resolved Next binary lives at  <project>\node_modules\next\dist\bin\next
// When npm invokes it through the `.bin` shim the command line shows
//   <project>\node_modules\.bin\..\next\dist\bin\next
// so we collapse the `\.bin\..\` and compare case-insensitively on Windows.
const nextBinToken = 'node_modules' + path.sep + 'next' + path.sep + 'dist' + path.sep + 'bin' + path.sep + 'next';

function normalizePath(p) {
  return IS_WINDOWS ? p.toLowerCase() : p;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --- find PIDs listening on the port ---------------------------------------

async function getListeningPids() {
  if (IS_WINDOWS) {
    // Get-NetTCPConnection exits non-zero when there are no matching connections
    // ("no port" is a perfectly normal case) — treat that as an empty list.
    try {
      const { stdout } = await execFileAsync('powershell', [
        '-NoProfile',
        '-Command',
        `Get-NetTCPConnection -LocalPort ${PORT} -State Listen -ErrorAction SilentlyContinue | `
          + `Select-Object -ExpandProperty OwningProcess -Unique`,
      ]);
      return [...new Set(stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];
    } catch {
      return [];
    }
  }
  // POSIX fallback (used only if this ever runs off Windows).
  try {
    const { stdout } = await execFileAsync('lsof', ['-ti', `tcp:${PORT}`]);
    return [...new Set(stdout.split(/\r?\n/).map((s) => s.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

async function getCommandLine(pid) {
  if (IS_WINDOWS) {
    const { stdout } = await execFileAsync('powershell', [
      '-NoProfile',
      '-Command',
      `(Get-CimInstance Win32_Process -Filter "ProcessId=${pid}").CommandLine`,
    ]);
    return stdout.trim();
  }
  try {
    const { stdout } = await execFileAsync('ps', ['-o', 'command=', '-p', pid]);
    return stdout.trim();
  } catch {
    return '';
  }
}

// --- "same project's `next start`?" ----------------------------------------

// A process is considered "this project's own next start" when its command line
// points at this project's Next binary AND `start` is among the CLI arguments.
//
// The captured command line can vary in noisy ways on Windows, so we tokenize
// and normalize rather than do a single substring match:
//   - the path may be absolute OR relative (`node_modules/next/dist/bin/next`)
//   - npm's `.bin` shim leaves a traversal segment: `node_modules\.bin\..\next\...`
//   - the CIM renderer can double the backslashes: `\.bin\\..\`
// We collapse those, resolve the Next-bin path against this project directory,
// and require it to land exactly on our real <project>\node_modules\...\next.
function isOurNextStart(cmdline) {
  if (!cmdline || !/(^|\s)start(\s|$)/.test(cmdline)) return false;
  const tokens = cmdline.match(/"[^"]*"|\S+/g) || [];
  const expected = normalizePath(
    path.join(projectDir, 'node_modules', 'next', 'dist', 'bin', 'next'),
  );
  for (const raw of tokens) {
    const token = raw.replace(/^"|"$/g, '');
    let norm = normalizePath(token)
      .replace(/\\\\+/g, '\\') // collapse doubled backslashes (CIM quirk)
      .replace(/\\\.bin\\\.\./g, '') // drop npm `.bin\..` traversal
      .replace(/\//g, path.sep);
    if (!norm.endsWith(normalizePath(path.join('node_modules', 'next', 'dist', 'bin', 'next')))) {
      continue;
    }
    if (normalizePath(path.resolve(projectDir, norm)) === expected) return true;
  }
  return false;
}

async function killProcess(pid) {
  if (IS_WINDOWS) {
    await execFileAsync('taskkill', ['/PID', pid, '/T', '/F']);
  } else {
    try {
      process.kill(Number(pid), 'SIGTERM');
      await sleep(500);
      process.kill(Number(pid), 'SIGKILL');
    } catch {
      // already gone
    }
  }
}

async function waitForPortFree(timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pids = await getListeningPids();
    if (pids.length === 0) return true;
    await sleep(250);
  }
  return false;
}

// --- main -------------------------------------------------------------------

async function main() {
  const pids = await getListeningPids();

  if (pids.length > 0) {
    const ours = [];
    const others = [];
    for (const pid of pids) {
      const cmdline = await getCommandLine(pid);
      (isOurNextStart(cmdline) ? ours : others).push({ pid, cmdline });
    }

    if (others.length > 0) {
      // A foreign process is holding the port — this looks like a real conflict,
      // not a leftover of this project. Refuse to kill something we don't own.
      console.error(
        `[start-server] Port ${PORT} is already in use by a process that is not ` +
          `this project's \`next start\`:\n` +
          others.map((o) => `  PID ${o.pid}: ${o.cmdline || '(unknown)'}`).join('\n') +
          ``,
      );
      if (ours.length > 0) {
        console.error(`[… but these ARE from this project: ${ours.map((o) => o.pid).join(', ')}]`);
      }
      console.error(`Aborting — free port ${PORT} or run on another port (PORT=<n> npm run start).`);
      process.exit(1);
    }

    // Same project's stale `next start` — restart it.
    for (const { pid, cmdline } of ours) {
      console.error(`[start-server] Restarting stale server (PID ${pid}): ${cmdline}`);
      try {
        await killProcess(pid);
      } catch (err) {
        console.error(`[start-server] Failed to kill PID ${pid}: ${err.message}`);
        process.exit(1);
      }
    }

    const freed = await waitForPortFree();
    if (!freed) {
      console.error(`[start-server] Port ${PORT} did not free up after stopping old servers.`);
      process.exit(1);
    }
  }

  // Start the real server, inheriting stdio so logs flow to the terminal.
  const nextBin = path.join('node_modules', 'next', 'dist', 'bin', 'next');
  const child = spawn(
    process.execPath,
    [nextBin, ...process.argv.slice(2)],
    { stdio: 'inherit', windowsHide: false, env: process.env },
  );

  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => child.kill(signal));
  }
  child.on('error', (error) => {
    console.error(`[start-server] ${error.message}`);
    process.exitCode = 1;
  });
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal);
    process.exit(code ?? 0);
  });
}

// Run only when executed directly (also lets tests import isOurNextStart).
const isMainModule =
  process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMainModule) {
  main().catch((err) => {
    console.error(`[start-server] ${err.stack || err}`);
    process.exit(1);
  });
}

export { isOurNextStart }; // used by _test-match.mjs
