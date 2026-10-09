import BotanicalBanner from './BotanicalBanner'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import type { CampaignSlide } from '../lib/home-campaigns'
import { SiteImage } from './SiteImage'

export default function CampaignCarousel({ slides }: { slides: CampaignSlide[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [hovered, setHovered] = useState(false)
  const [visible, setVisible] = useState(() => !document.hidden)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const suppressClickUntil = useRef(0)
  const activeIndex = index % Math.max(slides.length, 1)
  const slide = slides[activeIndex]

  useEffect(() => {
    const update = () => setVisible(!document.hidden)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const reduce = () => { if (motion.matches) setPaused(true) }
    document.addEventListener('visibilitychange', update)
    motion.addEventListener('change', reduce)
    return () => {
      document.removeEventListener('visibilitychange', update)
      motion.removeEventListener('change', reduce)
    }
  }, [])

  useEffect(() => {
    if (slides.length < 2 || paused || hovered || !visible) return
    const timer = window.setTimeout(() => setIndex(current => (current + 1) % slides.length), 6000)
    return () => window.clearTimeout(timer)
  }, [slides.length, activeIndex, paused, hovered, visible])

  const move = (direction: number) => setIndex(current => (current + direction + slides.length) % Math.max(slides.length, 1))
  if (!slide) return null

  return <div role="region" aria-roledescription="karusel" aria-label="Ana sayfa kampanyaları" className="min-w-0" onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true) }} onPointerLeave={() => setHovered(false)} onFocusCapture={event => { if (!(event.target as HTMLElement).closest('[data-carousel-rotation]')) setPaused(true) }} onKeyDown={event => {
    if (slides.length > 1 && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault()
      move(event.key === 'ArrowRight' ? 1 : -1)
    }
  }}>

    <div className="touch-pan-y overflow-hidden rounded-lg border border-brand-line bg-brand-soft" onPointerDown={event => {
      if (event.pointerType === 'touch') touch.current = { x: event.clientX, y: event.clientY }
    }} onPointerCancel={() => { touch.current = null }} onPointerUp={event => {
      if (!touch.current) return
      const dx = event.clientX - touch.current.x, dy = event.clientY - touch.current.y
      touch.current = null
      if (slides.length > 1 && Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        setPaused(true)
        suppressClickUntil.current = performance.now() + 350
        move(dx < 0 ? 1 : -1)
      }
    }} onClickCapture={event => { if (performance.now() < suppressClickUntil.current) { event.preventDefault(); event.stopPropagation() } }}>
      <div key={slide.id} role="group" aria-roledescription="slayt" aria-label={`${activeIndex + 1} / ${slides.length}: ${slide.title}`} aria-live={paused ? 'polite' : 'off'} className="campaign-slide">
        {slide.id === 'botanical' ? <BotanicalBanner /> : <Link to={slide.href} aria-label={`${slide.title} kampanyasını incele`} className="block aspect-[2/1] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-brand md:aspect-[5/1]">
          <SiteImage src={slide.image} variant="hero" sizes="(min-width: 1280px) 1216px, calc(100vw - 32px)" loading="eager" fetchPriority={activeIndex === 0 ? 'high' : 'auto'} alt={slide.title} className="h-full w-full object-contain" />
        </Link>}
      </div>
    </div>
    {slides.length > 1 && <div className="mt-2 flex min-w-0 flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 flex-wrap" aria-label="Kampanya seçimi">{slides.map((item, position) => <button key={item.id} type="button" aria-label={`${position + 1}. kampanyayı göster`} aria-current={position === activeIndex ? 'true' : undefined} onClick={() => setIndex(position)} className="grid h-11 w-11 place-items-center rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"><span className={`h-2 rounded-full ${position === activeIndex ? 'site-primary-bg w-6' : 'w-2 bg-zinc-300'}`} /></button>)}</div>
      <div className="flex shrink-0 gap-2">
        <button data-carousel-rotation type="button" onClick={() => setPaused(current => !current)} className="shop-icon-button" aria-label={paused ? 'Otomatik geçişi başlat' : 'Otomatik geçişi durdur'}>{paused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}</button>
        <button type="button" onClick={() => move(-1)} className="shop-icon-button" aria-label="Önceki banner"><ChevronLeft className="h-5 w-5" /></button>
        <button type="button" onClick={() => move(1)} className="shop-icon-button" aria-label="Sonraki banner"><ChevronRight className="h-5 w-5" /></button>
      </div>
    </div>}
  </div>
}
