import { type ThemeKey } from '../lib/category-artwork'
import './category-artwork.css'

export default function CategoryArtwork({ theme, part, className = '' }: { theme: ThemeKey; part: 'upper' | 'lower'; className?: string }) {
  if (theme === 'plain') return null
  return <img src={`/artwork/transparent/${theme}-${part}.png`} alt="" aria-hidden="true" decoding="async"
    data-transparent-artwork={`${theme}-${part}`} className={`category-artwork ${className}`} />
}
