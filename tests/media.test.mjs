import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { createRequire } from 'node:module'
const ts=createRequire(import.meta.url)('typescript')
const file=new URL('../src/utils/media.ts',import.meta.url)
const code=ts.transpileModule(existsSync(file)?readFileSync(file,'utf8'):'',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
const mod={exports:{}};new Function('exports','module',code)(mod.exports,mod)
const origin='https://images.example.com'
test('responsive URLs only transform own public media and use bounded widths',()=>{
 const props=mod.exports.imageSources(origin+'/urun-gorselleri/hash.jpg','card',origin,true)
 assert.match(props.srcSet,/width=320/);assert.match(props.srcSet,/width=640/)
 assert.match(props.src,/format=auto,quality=80,fit=scale-down/)
 for(const url of ['https://other.example/a.jpg',origin+'/storage/v1/object/sign/siparis-fisleri/a.jpg?token=x','blob:local']) assert.equal(mod.exports.imageSources(url,'card',origin,true).srcSet,undefined)
 assert.equal(mod.exports.imageSources(origin+'/urun-gorselleri/a.jpg','card',origin,false).srcSet,undefined)
})
