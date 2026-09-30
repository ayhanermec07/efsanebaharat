import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const ts = require('typescript')

function loadTheme() {
  const source = fs.readFileSync(new URL('../src/lib/theme.ts', import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const module = { exports: {} }
  new Function('module', 'exports', outputText)(module, module.exports)
  return module.exports
}

const expected = { primaryColor: '#34513c', secondaryColor: '#a84b2b', backgroundColor: '#f7f2e8' }

test('Anadolu Aktarı bütün ziyaretçilere onaylı varsayılan paleti verir', () => {
  assert.deepEqual(loadTheme().defaultTheme, expected)
})

test('önceki tasarımın kaydı yeni görünümü yükleme sonrası geri çevirmez', () => {
  const { normalizeTheme } = loadTheme()
  assert.deepEqual(normalizeTheme({ primaryColor: '#c2410c', secondaryColor: '#dc2626', backgroundColor: '#f9fafb' }), expected)
  assert.deepEqual(normalizeTheme(null), expected)
})

test('yeni tasarımda kaydedilen renkler okunur, geçersiz CSS renkleri reddedilir', () => {
  const { normalizeTheme } = loadTheme()
  assert.deepEqual(normalizeTheme({ design: 'anadolu-aktari', primaryColor: '#456789', secondaryColor: 'url(example)', backgroundColor: 'red' }), {
    ...expected, primaryColor: '#456789',
  })
})

test('açık ana renkler beyaz yazı için en az 4.5 kontrasta koyulaştırılır', () => {
  const { colorForWhiteText } = loadTheme()
  for (const color of ['#ffffff', '#ffc800', '#34513c']) {
    const safe = colorForWhiteText(color)
    const channels = [1, 3, 5].map(offset => parseInt(safe.slice(offset, offset + 2), 16) / 255)
      .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
    assert.ok(1.05 / (luminance + 0.05) >= 4.5)
  }
})
