import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

export const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)]
export function compare(before,after){
 if(JSON.stringify(before.conditions)!==JSON.stringify(after.conditions))throw new Error('MEASUREMENT_CONDITIONS')
 return before.pages.map(old=>{
  const current=after.pages.find(page=>page.path===old.path)
  if(!current || old.runs.length!==3 || current.runs.length!==3)throw new Error('MEASUREMENT_SAMPLES')
  const oldBytes=median(old.runs.map(run=>run.imageBytes)),newBytes=median(current.runs.map(run=>run.imageBytes))
  const oldLcp=median(old.runs.map(run=>run.lcpMs)),newLcp=median(current.runs.map(run=>run.lcpMs))
  const reduction=oldBytes>0?1-newBytes/oldBytes:0
  return {path:old.path,beforeImageBytes:oldBytes,afterImageBytes:newBytes,reductionPercent:Math.round(reduction*10000)/100,beforeLcpMs:oldLcp,afterLcpMs:newLcp,accepted:reduction>=0.4 && newLcp>0 && oldLcp>0 && newLcp<=oldLcp && newLcp<=2500}
 })
}
export async function capture(base,paths){
 const origin=new URL(base);if(origin.protocol!=='https:' && !['127.0.0.1','localhost'].includes(origin.hostname))throw new Error('HTTPS_REQUIRED')
 // Give slow original images time to finish: an early cutoff can report a
 // text LCP while the larger visible image is still downloading.
 const conditions={viewport:{width:390,height:844},downloadBytesPerSecond:200000,uploadBytesPerSecond:93750,latencyMs:150,cpuRate:4,observationMs:30000,browser:'chromium'}
 const browser=await chromium.launch({headless:true,channel:'chrome'});const pages=[]
 try{
  for(const path of paths){
   if(!path.startsWith('/') || path.startsWith('//') || path.includes('?'))throw new Error('PATH_REQUIRED')
   const runs=[]
   for(let i=0;i<3;i++){
    const context=await browser.newContext({viewport:conditions.viewport,deviceScaleFactor:1,isMobile:true,hasTouch:true})
    const page=await context.newPage(),cdp=await context.newCDPSession(page),images=new Set(),received=new Map();let cacheHits=0
    await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true})
    await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:conditions.latencyMs,downloadThroughput:conditions.downloadBytesPerSecond,uploadThroughput:conditions.uploadBytesPerSecond})
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:conditions.cpuRate})
    cdp.on('Network.responseReceived',event=>{if(event.type==='Image'){images.add(event.requestId);if(Object.entries(event.response.headers).some(([key,value])=>key.toLowerCase()==='cf-cache-status' && value==='HIT'))cacheHits++}})
    // Include partially downloaded images: with slow networking, large parallel
    // responses may not finish within the observation window.
    cdp.on('Network.dataReceived',event=>{received.set(event.requestId,(received.get(event.requestId)||0)+event.encodedDataLength)})
    cdp.on('Network.loadingFinished',event=>{received.set(event.requestId,Math.max(received.get(event.requestId)||0,event.encodedDataLength))})
    await page.addInitScript(()=>{window.__mediaLcp=0;window.__mediaLcpElement=null;new PerformanceObserver(list=>{const entry=list.getEntries().at(-1);window.__mediaLcp=entry?.startTime||0;window.__mediaLcpElement={tag:entry?.element?.tagName,alt:entry?.element?.alt,url:entry?.url?.split('?')[0]}}).observe({type:'largest-contentful-paint',buffered:true})})
    await page.goto(new URL(path,origin).href,{waitUntil:'domcontentloaded',timeout:60000})
    await page.waitForTimeout(conditions.observationMs)
    const imageBytes=[...images].reduce((sum,id)=>sum+(received.get(id)||0),0)
    runs.push({imageBytes,lcpMs:Math.round(await page.evaluate(()=>window.__mediaLcp)),lcpElement:await page.evaluate(()=>window.__mediaLcpElement),images:images.size,cacheHits})
    await context.close()
   }
   pages.push({path,runs})
  }
 }finally{await browser.close()}
 return {createdAt:new Date().toISOString(),conditions,pages}
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const [action,first,second,...paths]=process.argv.slice(2)
  if(action==='capture')await writeFile(second,JSON.stringify(await capture(first,paths),null,2))
  else if(action==='compare'){const result=compare(JSON.parse(await readFile(first)),JSON.parse(await readFile(second)));console.log(JSON.stringify(result,null,2));if(result.some(page=>!page.accepted))process.exitCode=1}
  else throw new Error('ACTION_REQUIRED')
 }catch{console.error('MEDIA_MEASUREMENT_FAILED');process.exitCode=1}
}
