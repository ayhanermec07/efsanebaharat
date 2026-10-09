import { readFile, writeFile } from 'node:fs/promises'
// Display geometry can change; provenance and original pixels remain untouched.
const file = 'src/lib/approved-artwork.ts'
const previous = JSON.parse((await readFile(file, 'utf8')).split(' = ')[1].split(' as const')[0])
const sources = JSON.parse(await readFile('scripts/approved-artwork-sources.json', 'utf8'))
const output = Object.fromEntries(Object.entries(sources).map(([key, value]) => [key, {
  ...value, url: previous[key].url, width: previous[key].width, height: previous[key].height, sourceSha256: previous[key].sourceSha256,
}]))
await writeFile(file, '// Approved originals, losslessly encoded. Rectangles are browser display windows, not generated substitutes.\nexport const APPROVED_SOURCES = ' + JSON.stringify(output, null, 2) + ' as const\n')
