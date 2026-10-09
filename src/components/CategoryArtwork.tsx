import { type ThemeKey } from '../lib/category-artwork'
import { APPROVED_SOURCES } from '../lib/approved-artwork'
import ApprovedArtwork from './ApprovedArtwork'
import './category-artwork.css'

export default function CategoryArtwork({ theme, part, className = '' }: { theme: ThemeKey; part: 'upper' | 'lower'; className?: string }) {
  if (theme === 'plain') return null
  const asset = APPROVED_SOURCES[theme]
  return <ApprovedArtwork source={theme} region={asset[part]}
    cutout={part === 'lower' && 'cutout' in asset ? asset.cutout : undefined}
    clip={part === 'upper' && 'upperClip' in asset ? asset.upperClip : undefined}
    className={`category-artwork ${className}`} />
}
