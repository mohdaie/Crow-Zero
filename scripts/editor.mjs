// Builds the map editor from the game's own layout code, so the editor's
// footprints and checks always match the game. Usage:
//   node scripts/editor.mjs                 -> tools/map-editor.html (full page)
//   node scripts/editor.mjs --artifact out  -> page body for a Claude artifact
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '..');
export async function buildEditor() {
  const { TOWN_PLAN } = await import(resolve(root, 'src/town-plan.js'));
  const layout = (await readFile(resolve(root, 'src/town-layout.js'), 'utf8'))
    .replace(/^import .*town-plan\.js.*\n/m, '')
    .replace(/^export /gm, '');
  const template = await readFile(resolve(root, 'tools/map-editor.src.html'), 'utf8');
  return template.replace('/*@LAYOUT@*/', `const TOWN_PLAN = ${JSON.stringify(TOWN_PLAN)};\n${layout}`);
}
const page = body => `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"></head><body>\n${body}\n</body></html>\n`;
if (import.meta.url === `file://${process.argv[1]}`) {
  const body = await buildEditor(), at = process.argv.indexOf('--artifact');
  if (at > -1) await writeFile(process.argv[at + 1], body);
  else await writeFile(resolve(root, 'tools/map-editor.html'), page(body));
  console.log('Built the map editor.');
}
export { page };
