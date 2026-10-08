import type { CampaignSlide } from './home-campaigns'

export const INTRO_SESSION_KEY = 'efsane-spice-intro-seen'
export function shouldPlayIntro(seen: boolean, reducedMotion: boolean) {
  return !seen && !reducedMotion
}
export function withBotanicalSlide(campaigns: CampaignSlide[]): CampaignSlide[] {
  return [{ id: 'botanical', title: 'Sofranın sırrı, bir tutam baharat.', href: '/urunler', image: '' }, ...campaigns]
}
