import { useCallback, useEffect, useRef, useState } from 'react'
import type { CampaignSlide } from '../lib/home-campaigns'
import { INTRO_SESSION_KEY, shouldPlayIntro, withBotanicalSlide } from '../lib/home-intro'
import CampaignCarousel from './CampaignCarousel'
import BotanicalBanner from './BotanicalBanner'
import '../styles/artistic-home.css'

export default function HomeHero({ campaigns }: { campaigns: CampaignSlide[] }) {
  const [intro, setIntro] = useState(() => {
    let seen = false
    try { seen = sessionStorage.getItem(INTRO_SESSION_KEY) === '1' } catch { /* Storage can be unavailable in private browser modes. */ }
    return shouldPlayIntro(seen, window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  })
  const [source] = useState(() => window.matchMedia('(max-width: 767px)').matches ? '/artwork/spice-intro-mobile.webm' : '/artwork/spice-intro-desktop.webm')
  const [exiting, setExiting] = useState(false)
  const exitingRef = useRef(false)
  const exitTimer = useRef<number>()
  const video = useRef<HTMLVideoElement>(null)
  const loadingTimer = useRef<number>()
  const playbackTimer = useRef<number>()
  const finish = useCallback(() => {
    window.clearTimeout(loadingTimer.current)
    window.clearTimeout(playbackTimer.current)
    if (exitingRef.current) return
    exitingRef.current = true
    setExiting(true)
    exitTimer.current = window.setTimeout(() => setIntro(false), window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350)
  }, [])

  useEffect(() => {
    if (!intro) return
    try { sessionStorage.setItem(INTRO_SESSION_KEY, '1') } catch { /* Intro still works when storage is blocked. */ }
    loadingTimer.current = window.setTimeout(finish, 3500)
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const reduce = () => { if (motion.matches) finish() }
    motion.addEventListener('change', reduce)
    video.current?.play().catch(finish)
    return () => {
      window.clearTimeout(loadingTimer.current)
      window.clearTimeout(playbackTimer.current)
      window.clearTimeout(exitTimer.current)
      motion.removeEventListener('change', reduce)
    }
  }, [intro, finish])

  return <div className="home-hero">
    {intro ? <><div className={`home-intro ${exiting ? 'home-intro-exiting' : ''}`} aria-label="Baharatlardan bir karşılama">
      <div className="home-intro-backdrop" aria-hidden="true"><BotanicalBanner preview /></div>
      <video ref={video} src={source} autoPlay muted playsInline preload="auto" poster="/artwork/spice-intro-poster.webp" aria-hidden="true" onEnded={finish} onError={finish} onPlaying={() => {
        window.clearTimeout(loadingTimer.current)
        window.clearTimeout(playbackTimer.current)
        playbackTimer.current = window.setTimeout(finish, 4650)
      }}>
      </video>
      <div className="home-intro-copy">
        <h1>Efsane lezzetler<br />her zaman yanınızda.</h1>
        <p>Mutfağınıza ilham veren tatları keşfedin.</p>
      </div>
      <button type="button" onClick={finish} className="home-intro-skip">Atla <span aria-hidden="true">→</span></button>
    </div>{campaigns.length > 0 && <div className="home-intro-controls-spacer" aria-hidden="true" />}</> : <CampaignCarousel slides={withBotanicalSlide(campaigns)} />}
  </div>
}
