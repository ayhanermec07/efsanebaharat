import '../styles/support.css'

type ArtKind = 'pouch' | 'envelope-open' | 'envelope-closed' | 'parcel' | 'divider' | 'leaf' | 'footer-brand' | 'footer-left' | 'footer-right' | 'bestseller-left' | 'bestseller-right' | 'category-left' | 'category-right' | 'home-left' | 'home-right' | 'coupon'

export function ArtDecoration({ kind, className = '' }: { kind: ArtKind; className?: string }) {
  return <img src={`/artwork/transparent/${kind}.png`} alt="" aria-hidden="true" decoding="async" data-transparent-artwork={kind} className={`art-decoration art-decoration--${kind} ${className}`} />
}
