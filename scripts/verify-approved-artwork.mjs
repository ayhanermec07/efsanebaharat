import { chromium } from '@playwright/test'
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
const originals = process.argv[2]
if (!originals) throw new Error('Usage: node scripts/verify-approved-artwork.mjs <approved-originals-directory>')
const manifest = JSON.parse((await readFile('src/lib/approved-artwork.ts','utf8')).split(' = ')[1].split(' as const')[0])
const browser = await chromium.launch({channel:'chrome',headless:true})
const results = []
try {
  const page = await browser.newPage()
  for (const [key, asset] of Object.entries(manifest)) {
    const png = await readFile(join(originals, asset.file)), webp = await readFile(`public${asset.url}`)
    if (createHash('sha256').update(png).digest('hex') !== asset.sourceSha256) throw new Error(`${key}: source provenance differs`)
    const match = await page.evaluate(async ({png,webp})=>{
      async function decode(url) {
        const image = new Image();image.src=url;await image.decode()
        const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height
        const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0)
        return {width:image.width,height:image.height,pixels:ctx.getImageData(0,0,image.width,image.height).data}
      }
      const a=await decode(png),b=await decode(webp)
      return a.width===b.width && a.height===b.height && a.pixels.every((v,i)=>v===b.pixels[i])
    },{png:`data:image/png;base64,${png.toString('base64')}`,webp:`data:image/webp;base64,${webp.toString('base64')}`})
    if (!match) throw new Error(`${key}: original pixels differ`)
    results.push({theme:key,original:asset.file,sourceSha256:asset.sourceSha256,pixelIdentical:true,assetSha256:createHash('sha256').update(webp).digest('hex')})
  }
  await mkdir('docs/artwork',{recursive:true})
  await writeFile('docs/artwork/approved-source-verification.json',JSON.stringify({checkedOn:new Date().toISOString().slice(0,10),method:'Browser decoded RGBA pixel equality and original SHA-256',results},null,2)+'\n')
  console.log(`${results.length} approved originals: hashes and decoded pixels match exactly`)
} finally {await browser.close()}
