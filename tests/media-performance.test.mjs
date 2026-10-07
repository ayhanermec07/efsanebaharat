import test from 'node:test'
import assert from 'node:assert/strict'
import { compare } from '../scripts/media-performance.mjs'
const sample=(bytes,lcp)=>({conditions:{network:'same'},pages:[{path:'/',runs:bytes.map((imageBytes,index)=>({imageBytes,lcpMs:lcp[index]}))}]})
test('acceptance uses three medians, rejects worse LCP and mismatched conditions',()=>{
 const before=sample([1000,9000,1100],[2300,2400,9000])
 const after=sample([500,600,9000],[2200,2300,8000])
 assert.equal(compare(before,after)[0].accepted,true)
 assert.equal(compare(before,sample([500,600,9000],[2500,2600,8000]))[0].accepted,false)
 assert.throws(()=>compare(before,{...after,conditions:{network:'different'}}),/CONDITIONS/)
})
