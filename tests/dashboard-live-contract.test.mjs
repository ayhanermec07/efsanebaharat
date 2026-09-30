import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const ts = require('typescript')

function loader(client, period = 30) {
  const source = fs.readFileSync(new URL('../src/pages/admin/Dashboard.tsx', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('Dashboard.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  let declaration
  function visit(node) {
    if (ts.isFunctionDeclaration(node) && node.name?.text === 'loadDashboardData') declaration = node
    ts.forEachChild(node, visit)
  }
  visit(ast)
  const { outputText } = ts.transpileModule(declaration.getText(ast), { compilerOptions: { target: ts.ScriptTarget.ES2020 } })
  const result = { data: null, loading: [], errors: [] }
  const run = new Function('supabase', 'setLoading', 'setDashboardData', 'toast', 'period', 'console', outputText + '\nreturn loadDashboardData')(
    client, value => result.loading.push(value), value => { result.data = value }, { error: value => result.errors.push(value) }, period, { error() {} }
  )
  return { result, run }
}

const dashboard = {
  stats: { toplamUrun: 12, toplamSiparis: 4, toplamMusteri: 3, toplamGelir: 150, bekleyenSorular: 1, aktifKampanyalar: 2, aktifBayiler: 2, kargoBekleyen: 1, bannerSayisi: 1, onerilenUrunler: 5 },
  enCokSatanlar: [{ urun_adi: 'Kimyon', toplam_satis: 4 }], enCokZiyaretEdilen: [], gunlukSatislar: [{ tarih: '2026-09-30', tutar: 150 }], aylikSatislar: []
}

test('canlı Dashboard mevcut yetkili Edge servisini kullanır; eksik RPC çağrılmaz', async () => {
  const calls = []
  const { result, run } = loader({ functions: { invoke: async (...args) => { calls.push(args); return { data: { data: dashboard }, error: null } } } }, 7)
  await run()
  assert.deepEqual(calls, [['dashboard-data', { body: { period: 7 } }]])
  assert.deepEqual(result.data, dashboard)
  assert.deepEqual(result.loading, [true, false])
  assert.deepEqual(result.errors, [])
})

test('yetki veya servis hatası başarı verisi gibi işlenmez', async () => {
  const { result, run } = loader({ functions: { invoke: async () => ({ data: null, error: new Error('Yetki gerekli') }) } })
  await run()
  assert.equal(result.data, null)
  assert.deepEqual(result.errors, ['Dashboard verileri yüklenemedi'])
  assert.deepEqual(result.loading, [true, false])
})
