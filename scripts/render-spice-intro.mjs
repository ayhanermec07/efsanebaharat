import { chromium } from '@playwright/test'
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import { resolve, sep } from 'node:path'

// Deterministic production video: photographic keyframe and individually moving spice grains.
const image = 'data:image/webp;base64,' + (await readFile('public/artwork/spice-intro-poster.webp')).toString('base64')
const browser = await chromium.launch({ channel: 'chrome', headless: true })
try {
  const page = await browser.newPage()
  for (const [name, width, height] of [['desktop', 1280, 400], ['mobile', 640, 320]]) {
    await page.evaluate(async ({ image, width, height }) => {
      const img = new Image(); img.src = image; await img.decode()
      const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')
      let seed = 8213
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
      const palette = ['#a83110', '#bf4913', '#dd6b1c', '#e7aa28', '#efbc40', '#38251b', '#605039', '#7b8645']
      const grains = Array.from({ length: 1200 }, () => ({ phase: random(), lane: random(), radius: .3 + random() * 2.7, color: palette[Math.floor(random() * palette.length)], rotation: random() * 6.28, speed: .12 + random() * .19 }))
      const draw = t => {
        const scale = Math.max(width / img.width, height / img.height)
        const dw = img.width * scale, dh = img.height * scale
        ctx.fillStyle = '#f5e6cb'; ctx.fillRect(0, 0, width, height)
        ctx.save()
        ctx.translate(width * .48, height * .5)
        const zoom = 1 + .016 * Math.sin(t * .7)
        ctx.scale(zoom, zoom)
        ctx.drawImage(img, -dw * (width < 800 ? .30 : .48), -dh * .5, dw, dh)
        ctx.restore()
        for (const grain of grains) {
          const p = (grain.phase + t * grain.speed) % 1
          const envelope = Math.sin(p * Math.PI)
          const x = width * (.12 + p * .57) + Math.sin(p * 9 + grain.lane * 7 + t) * width * .035
          const y = height * (.43 + Math.sin(p * 6.28 + grain.lane * 2) * (.10 + grain.lane * .27))
          const r = grain.radius * (width / 1280) * (1 + envelope)
          ctx.save(); ctx.translate(x, y); ctx.rotate(grain.rotation + t * .55)
          ctx.globalAlpha = .68 * envelope
          ctx.fillStyle = grain.color
          ctx.shadowColor = '#51361d44'; ctx.shadowBlur = r; ctx.shadowOffsetY = r * .4
          ctx.beginPath(); ctx.ellipse(0, 0, r, r * .7, 0, 0, Math.PI * 2); ctx.fill()
          ctx.restore()
        }
      }
      window.renderSpiceFrame = t => { draw(t); return canvas.toDataURL('image/png').split(',')[1] }
    }, { image, width, height })
    const frames = resolve(`.artistic-video-frames/${name}`)
    if (!frames.startsWith(resolve('.artistic-video-frames') + sep)) throw new Error('Frame output must remain inside the artwork workspace')
    await mkdir(frames, { recursive: true })
    for (let frame = 0; frame < 120; frame++) {
      const png = await page.evaluate(t => window.renderSpiceFrame(t), frame / 24)
      await writeFile(`${frames}/${String(frame).padStart(3, '0')}.png`, Buffer.from(png, 'base64'))
    }
    const encoder = process.env.ARTWORK_FFMPEG || 'ffmpeg'
    const result = spawnSync(encoder, ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '24', '-i', `${frames}/%03d.png`, '-frames:v', '120', '-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', '-pix_fmt', 'yuv420p', `public/artwork/spice-intro-${name}.webm`], { encoding: 'utf8' })
    if (result.status !== 0) throw new Error(result.stderr || String(result.error))
    await rm(frames, { recursive: true, force: true })
    console.log(`${name}: 120 frames, 5 seconds, ${width}x${height}`)
  }
} finally { await browser.close() }
