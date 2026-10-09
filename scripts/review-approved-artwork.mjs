import { chromium } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'
const sources = JSON.parse(await readFile('scripts/approved-artwork-sources.json', 'utf8'))
const cards = []
for (const [key, asset] of Object.entries(sources)) {
  const image = 'data:image/webp;base64,' + (await readFile(`public/artwork/approved/${key}.webp`)).toString('base64')
  const [width, height] = key === 'home' ? [1341,1173] : asset.upper ? [1448,1086] : [1536,1024]
  for (const [part, rect] of Object.entries(asset).filter(([k,v]) => Array.isArray(v) && !['cutout','upperCutout'].includes(k))) {
    const [x,y,w,h] = rect
    const cut = part === 'lower' ? asset.cutout : part === 'upper' ? asset.upperCutout : undefined
    const polygon = asset[`${part}Clip`] || asset.clip || (cut ? `${cut[0]},${y} ${x+w},${y} ${x+w},${y+h} ${x},${y+h} ${x},${cut[1]} ${cut[0]},${cut[1]}` : '')
    cards.push(`<section><b>${key} / ${part}</b><svg viewBox="${rect.join(' ')}" style="width:270px;height:auto;aspect-ratio:${w}/${h}"><defs><clipPath id="c${cards.length}"><polygon points="${polygon}"/></clipPath></defs><image href="${image}" width="${width}" height="${height}" ${polygon ? `clip-path="url(#c${cards.length})"` : ''}/></svg></section>`)
  }
}
const browser = await chromium.launch({ channel:'chrome', headless:true })
try {
  const page = await browser.newPage({ viewport:{ width:1200, height:1000 } })
  await mkdir('test-results/approved-artwork', { recursive:true })
  for(let i=0;i<cards.length;i+=12) {
    await page.setContent(`<style>body{margin:16px;background:#faf6ec;font:16px Arial}main{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}section{min-height:245px;border:1px solid #cbbfa8;padding:6px}svg{display:block;mix-blend-mode:multiply}</style><main>${cards.slice(i,i+12).join('')}</main>`)
    await page.evaluate(async()=>Promise.all(Array.from(document.querySelectorAll('image')).map(el=>new Promise(resolve=>{const im=new Image();im.onload=resolve;im.src=el.getAttribute('href')}))))
    await page.screenshot({path:`test-results/approved-artwork/sheet-${i/12+1}.png`,fullPage:true})
  }
} finally { await browser.close() }
