import { chromium } from '@playwright/test'
import { readFile,mkdir } from 'node:fs/promises'
const rows=JSON.parse(await readFile('scripts/transparent-artwork-report.json','utf8'))
const browser=await chromium.launch({channel:'chrome',headless:true})
try{
 const page=await browser.newPage({viewport:{width:1200,height:900}})
 await mkdir('test-results/png-alpha',{recursive:true})
 for(let i=0;i<rows.length;i+=12){
  const html=await Promise.all(rows.slice(i,i+12).map(async row=>`<section><b>${row.key}</b><div><img src="data:image/png;base64,${(await readFile('public/artwork/transparent/'+row.key+'.png')).toString('base64')}"></div></section>`))
  await page.setContent('<style>body{margin:10px;background:#eee;font:14px Arial}main{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}section>div{background:linear-gradient(90deg,#faf7ef 50%,#294434 50%);height:240px;display:grid;place-items:center}img{max-width:270px;max-height:225px}</style><main>'+html.join('')+'</main>')
  await page.evaluate(async()=>Promise.all(Array.from(document.images).map(im=>im.decode())))
  await page.evaluate(() => {
   for (const img of document.images) {
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0)
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
    let transparent = 0, painted = 0
    for (let i = 3; i < pixels.length; i += 4) {
     if (pixels[i] === 0) transparent++
     if (pixels[i] > 200) painted++
    }
    const count = canvas.width * canvas.height
    if (transparent / count < .08 || painted / count < .01) throw new Error('Missing alpha or empty artwork: ' + img.closest('section').textContent)
    for (const index of [3, canvas.width * 4 - 1, (canvas.height - 1) * canvas.width * 4 + 3, pixels.length - 1]) {
     if (pixels[index] !== 0) throw new Error('Opaque PNG corner: ' + img.closest('section').textContent)
    }
   }
  })
  await page.screenshot({path:`test-results/png-alpha/sheet-${i/12+1}.png`,fullPage:true})
 }
 console.log(`${rows.length} PNGs decoded; transparent corners and nonempty artwork verified`)
}finally{await browser.close()}
