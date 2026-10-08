import { CATEGORY_THEMES, type ThemeKey } from '../lib/category-artwork'
import './category-artwork.css'

export default function CategoryArtwork({ theme, part, className = '' }: { theme: ThemeKey; part: 'upper' | 'lower'; className?: string }) {
  const index = CATEGORY_THEMES.findIndex(([key]) => key === theme)
  if (index < 0) return null
  return <span aria-hidden="true" className={`category-artwork ${className}`} style={{
    backgroundImage: `url(/artwork/theme-${part}.webp)`,
    backgroundPosition: `${(index % 4) * 100 / 3}% ${Math.floor(index / 4) * 100 / 3}%`,
  }} />
}
