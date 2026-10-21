// Season simulator: the I/O shell around the pure engine.
// Usage: pnpm sim fixtures/five-runners.json [--rules v1] [--as-of 2026-11-24T09:00:00Z]

import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Fixture } from '../fixtures';
import { scoreSeason } from '../src';
import { renderReport } from './report';

const packageDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv: string[]) {
  const args = {
    file: 'fixtures/five-runners.json',
    rules: undefined as string | undefined,
    asOf: undefined as string | undefined,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--rules') args.rules = argv[++i];
    else if (a === '--as-of') args.asOf = argv[++i];
    else args.file = a;
  }
  return args;
}

function findFile(file: string): string {
  // pnpm runs this from the package directory; resolve paths from where the command was typed first.
  const candidates = [
    resolve(process.env.INIT_CWD ?? process.cwd(), file),
    resolve(packageDir, file),
  ];
  const found = candidates.find((c) => existsSync(c));
  if (!found) throw new Error(`Fixture not found: ${file}`);
  return found;
}

const args = parseArgs(process.argv.slice(2));
const fixture = JSON.parse(readFileSync(findFile(args.file), 'utf8')) as Fixture;
if (args.rules) fixture.season.rulesVersion = args.rules;
if (args.asOf) fixture.asOf = args.asOf;
process.stdout.write(renderReport(fixture, scoreSeason(fixture)));
