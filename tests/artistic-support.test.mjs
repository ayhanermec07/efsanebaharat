import assert from 'node:assert/strict'
import fs from 'node:fs'
import { createRequire } from 'node:module'
import test from 'node:test'
const require = createRequire(import.meta.url)
const ts = require('typescript')
const React = require('react')
function render(file, states, overrides) {
  const updates = []
  let stateIndex = 0
  const react = { ...React, useState: initial => {
    const index = stateIndex++
    return [index in states ? states[index] : initial, value => updates.push([index, value])]
  }, useEffect: () => {}, useCallback: callback => callback }
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React } }).outputText
  new Function('require', 'exports', 'React', code)(name => name === 'react' ? react : name in overrides ? overrides[name] : new Proxy({}, { get: () => () => null }), exports, React)
  return { tree: exports.default(), updates }
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return null
  if (predicate(node)) return node
  for (const child of React.Children.toArray(node.props?.children)) {
    const result = find(child, predicate)
    if (result) return result
  }
  return null
}
test('contact shows confirmation only after the authenticated insert succeeds', async () => {
  for (const failed of [false, true]) {
    const inserted = []
    const { tree, updates } = render('../src/pages/BizeUlasin.tsx', { 2: { konu: 'Genel Sorular', soru_metni: '  Test mesajı yeterince uzun  ' } }, {
      '../contexts/AuthContext': { useAuth: () => ({ user: { id: 'real-user' }, loading: false }) },
      '../lib/supabase': { supabase: { from: table => ({ insert: async payload => { inserted.push([table, payload]); return { error: failed ? new Error('denied') : null } } }) } },
      'react-hot-toast': { default: { error: () => {}, success: () => {} } },
    })
    await find(tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} })
    assert.equal(inserted[0][0], 'sorular')
    assert.equal(inserted[0][1][0].kullanici_id, 'real-user')
    assert.equal(inserted[0][1][0].soru_metni, 'Test mesajı yeterince uzun')
    assert.equal(updates.some(([index, value]) => index === 1 && value === true), !failed)
  }
})
test('coupon copy confirms only resolved clipboard writes, and missing codes have no action', async () => {
  const campaign = { id: 'offer', kod: 'REALCODE', ad: 'Gerçek kampanya', urunler: [], toplam: 0 }
  for (const failed of [false, true]) {
    let copied
    Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { clipboard: { writeText: async value => { if (failed) throw new Error('denied'); copied = value } } } })
    const { tree, updates } = render('../src/pages/Kampanyalar.tsx', { 0: [campaign], 1: false }, {
      '../contexts/AuthContext': { useAuth: () => ({}) },
      'react-hot-toast': { default: { error: () => {} } },
    })
    const button = find(tree, node => node.type === 'button' && node.props['aria-label'] === 'REALCODE kampanya kodunu kopyala')
    assert.ok(button, 'real coupon copy button exists')
    await button.props.onClick()
    assert.equal(copied, failed ? undefined : 'REALCODE')
    assert.equal(updates.some(([, value]) => value === 'offer'), !failed)
  }
  const { tree } = render('../src/pages/Kampanyalar.tsx', { 0: [{ ...campaign, kod: '' }], 1: false }, { '../contexts/AuthContext': { useAuth: () => ({}) } })
  assert.equal(find(tree, node => node.type === 'button' && node.props['aria-label']?.includes('kampanya kodunu kopyala')), null)
})

test('contact confirmation hides the form and offers an explicit new message action', () => {
  const { tree, updates } = render('../src/pages/BizeUlasin.tsx', { 1: true }, {
    '../contexts/AuthContext': { useAuth: () => ({ user: { id: 'real-user' }, loading: false }) },
  })
  assert.equal(find(tree, node => node.type === 'form'), null)
  assert.ok(find(tree, node => node.props?.role === 'status'))
  find(tree, node => node.type === 'button' && node.props.children === 'Yeni mesaj yaz').props.onClick()
  assert.ok(updates.some(([index, value]) => index === 1 && value === false))
})

test('anonymous contact shows a login link and cannot submit a form', () => {
  const { tree } = render('../src/pages/BizeUlasin.tsx', {}, {
    '../contexts/AuthContext': { useAuth: () => ({ user: null, loading: false }) },
  })
  assert.equal(find(tree, node => node.type === 'form'), null)
  assert.ok(find(tree, node => node.props?.to === '/giris'))
})
