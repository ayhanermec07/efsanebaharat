import '../styles/support.css'

type ArtKind = 'pouch' | 'envelope-open' | 'envelope-closed' | 'parcel' | 'divider' | 'leaf'
const positions: Record<ArtKind, string> = {
  pouch: '0% 0%',
  'envelope-open': '50% 0%',
  'envelope-closed': '100% 0%',
  parcel: '0% 100%',
  divider: '50% 100%',
  leaf: '100% 100%',
}

export function ArtDecoration({ kind, className = '' }: { kind: ArtKind; className?: string }) {
  return <span aria-hidden="true" className={`art-decoration art-decoration--${kind} ${className}`} style={{ backgroundPosition: positions[kind] }} />
}
