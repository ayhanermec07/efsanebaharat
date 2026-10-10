import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
const browser=await chromium.launch({channel:'chrome',headless:true})
try {
 const page=await browser.newPage()
 await page.route('**/*',route=>new URL(route.request().url()).origin==='http://127.0.0.1:4197'?route.continue():route.fulfill({json:[]}))
 await mkdir('test-results/footer-reference',{recursive:true})
 for(const width of [360,390,768,1440]){
  await page.setViewportSize({width,height:1600});await page.goto('http://127.0.0.1:4197/urunler')
  await page.addStyleTag({content:'html{scroll-behavior:auto!important}'})
  const footer=page.locator('footer');await footer.scrollIntoViewIfNeeded()
  await page.evaluate(async()=>{await document.fonts.ready;await Promise.all(Array.from(document.querySelectorAll('footer img')).map(im=>im.decode()))})
  await footer.screenshot({path:`test-results/footer-reference/footer-${width}.png`})
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw new Error(`Overflow ${width}`)
 }
 await page.setContent('<style>body{margin:0;display:flex}div{width:33.333vw;height:300px;display:grid;place-items:center}img{width:200px}</style>'+['#fff','#31513b','#27272a'].map(bg=>`<div style="background:${bg}"><img src="http://127.0.0.1:4197/artwork/transparent/divider.png"></div>`).join(''))
 await page.evaluate(async()=>Promise.all(Array.from(document.images).map(im=>im.decode())))
 await page.screenshot({path:'test-results/footer-reference/alpha-backgrounds.png'})
}finally{await browser.close()}
