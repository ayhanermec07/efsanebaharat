import { useId } from 'react'
import { APPROVED_SOURCES } from '../lib/approved-artwork'
import './approved-artwork.css'

export type ArtworkRegion = readonly [number, number, number, number]

/** Shows an original approved illustration region; never redraws or substitutes the artwork. */
export default function ApprovedArtwork({ source, region, cutout, clip, className = '' }: {
  source: keyof typeof APPROVED_SOURCES
  region: ArtworkRegion
  cutout?: readonly [number, number]
  clip?: string
  className?: string
}) {
  const id = useId()
  const asset = APPROVED_SOURCES[source]
  const [x, y, width, height] = region
  return <svg aria-hidden="true" focusable="false" data-approved-artwork={source}
    className={`approved-artwork ${className}`} viewBox={region.join(' ')}
    style={{ aspectRatio: `${width} / ${height}` }}>
    {(cutout || clip) && <defs><clipPath id={id}><polygon points={clip || (cutout ? `${cutout[0]},${y} ${x + width},${y} ${x + width},${y + height} ${x},${y + height} ${x},${cutout[1]} ${cutout[0]},${cutout[1]}` : '')} /></clipPath></defs>}
    <image href={asset.url} width={asset.width} height={asset.height} clipPath={cutout || clip ? `url(#${id})` : undefined} />
  </svg>
}
