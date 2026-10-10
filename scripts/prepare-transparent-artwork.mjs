import { chromium } from '@playwright/test'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { resolve } from 'node:path'
const originals = process.argv[2]
if (!originals) throw new Error('Usage: node scripts/prepare-transparent-artwork.mjs <generated-PNG-directory>')
const jobs=JSON.parse(await readFile('scripts/transparent-artwork-inputs.json','utf8'))
const browser=await chromium.launch({channel:'chrome',headless:true})
try {
 const page=await browser.newPage()
 await mkdir('public/artwork/transparent',{recursive:true})
 const report=[]
 for(const job of jobs){
  const data='data:image/png;base64,'+(await readFile(resolve(originals, job.input))).toString('base64')
  const output=await page.evaluate(async({data,region,polygon,maxSize})=>{
   const im=new Image();im.src=data;await im.decode()
   const [rx,ry,rw,rh]=region||[0,0,1,1]
   const x=Math.round(rx*im.width),y=Math.round(ry*im.height),w=Math.round(rw*im.width),h=Math.round(rh*im.height)
   const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(polygon){ctx.beginPath();polygon.forEach(([px,py],i)=>ctx[i?'lineTo':'moveTo'](px*im.width-x,py*im.height-y));ctx.closePath();ctx.clip()}ctx.drawImage(im,x,y,w,h,0,0,w,h)
   const pixels=ctx.getImageData(0,0,w,h).data
   let minX=w,minY=h,maxX=0,maxY=0,transparent=0
   for(let j=0;j<h;j++)for(let i=0;i<w;i++){const a=pixels[(j*w+i)*4+3];if(a>0){minX=Math.min(minX,i);maxX=Math.max(maxX,i);minY=Math.min(minY,j);maxY=Math.max(maxY,j)}else transparent++}
   if(transparent/(w*h)<.08)throw new Error('PNG has no usable transparent background')
   const out=document.createElement('canvas');const bw=maxX-minX+1,bh=maxY-minY+1,scale=Math.min(1,(maxSize-8)/Math.max(bw,bh));out.width=Math.round(bw*scale)+8;out.height=Math.round(bh*scale)+8
   out.getContext('2d').drawImage(c,minX,minY,maxX-minX+1,maxY-minY+1,4,4,out.width-8,out.height-8)
   return {base64:out.toDataURL('image/png').split(',')[1],width:out.width,height:out.height,transparentRatio:transparent/(w*h)}
  },{data,region:job.region,polygon:job.polygon,maxSize:job.maxSize})
  await writeFile(`public/artwork/transparent/${job.key}.png`,Buffer.from(output.base64,'base64'))
  report.push({key:job.key,width:output.width,height:output.height,transparentRatio:output.transparentRatio})
 }
 await writeFile('scripts/transparent-artwork-report.json',JSON.stringify(report,null,2)+'\n')
 console.log(`${report.length} trimmed PNG assets preserve real alpha`)
}finally{await browser.close()}
