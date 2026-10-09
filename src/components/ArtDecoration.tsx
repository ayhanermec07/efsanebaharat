import '../styles/support.css'
import ApprovedArtwork from './ApprovedArtwork'
import { APPROVED_SOURCES as art } from '../lib/approved-artwork'

const decorations = {
  pouch: { source: 'pouch', region: art.pouch.region },
  'envelope-open': { source: 'contact', region: art.contact.open },
  'envelope-closed': { source: 'contact', region: art.contact.closed },
  parcel: { source: 'parcel', region: art.parcel.region },
  divider: { source: 'footer', region: art.footer.divider },
  leaf: { source: 'leaf', region: art.leaf.region },
  'footer-left': { source: 'footer', region: art.footer.left, clip: art.footer.leftClip },
  'footer-right': { source: 'footer', region: art.footer.right },
  'bestseller-left': { source: 'bestseller', region: art.bestseller.left },
  'bestseller-right': { source: 'bestseller', region: art.bestseller.right },
  'category-left': { source: 'category', region: art.category.left },
  'category-right': { source: 'category', region: art.category.right },
  'home-left': { source: 'home', region: art.home.left },
  'home-right': { source: 'home', region: art.home.right },
  coupon: { source: 'coupon', region: art.coupon.region, clip: art.coupon.clip },
} as const
type ArtKind = keyof typeof decorations

export function ArtDecoration({ kind, className = '' }: { kind: ArtKind; className?: string }) {
  return <ApprovedArtwork {...decorations[kind]} className={`art-decoration art-decoration--${kind} ${className}`} />
}
