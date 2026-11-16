// FROSTLINE v4 — best-game-01 entrypoint (Node 22, standard library only).
//
// The game lives in game/ beside this file as plain static files a desktop
// browser loads offline (game/index.html plus its ES modules, no library and
// no network request). This program hands it in: it copies game/ and
// screenshots/ from beside this file into the output directory and writes
// output/dossier.json, the summary the judge reads, using the vendored
// make.fun library. Nothing here fetches, signs, or spends anything.
//
// Run it locally the way the grader runs it, with an output directory of
// your own choosing:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Inside the grader's container MAKEFUN_OUTPUT_DIR is unset and the
// output directory is /output.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The repository root is the directory holding this file; the output
// directory is the grader's /output unless MAKEFUN_OUTPUT_DIR overrides it.
const root = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(root, 'game'), join(outputDir, 'game'), { recursive: true });
// buildDossier reads the screenshots from <outputDir>/screenshots/, so
// they are copied there too (they also ship inside game/screenshots/).
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(root, 'game', 'screenshots'))) {
  cpSync(join(root, 'game', 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's caps, mirrored from the competition gate: the dossier text is
// capped at 160 KiB, at most 4 screenshots of at most 256 KiB each, game/
// at most 993 files and 48 MiB in all with no path over 1,000 bytes. The
// dossier itself must stay under 1.5 MiB. Anything over a cap is refused
// by the gate before the judge ever sees it, so the build fails loudly here
// instead of silently there.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
