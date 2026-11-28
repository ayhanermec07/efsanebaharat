import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const conf = readFileSync(new URL('../nginx/default.conf.template', import.meta.url), 'utf8')

test('fiyatlı tedarikçi XML mağaza alan adından yayınlanmaz', () => {
  const block = conf.match(/location = \/urunler\.xml \{([^}]*)\}/)
  assert.ok(block, '/urunler.xml için açık bir kural olmalı (SPA 200 döndürmesin)')
  assert.match(block[1], /return 404;/)
  assert.ok(!/proxy_pass[^;]*urunler\.xml/.test(conf))
})
