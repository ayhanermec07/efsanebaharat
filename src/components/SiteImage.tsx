import { useState, type ImgHTMLAttributes } from 'react'
import { ImageOff } from 'lucide-react'
import { getImageUrl } from '../utils/imageUtils'
import { imageSources, imageSizes, type ImageVariant } from '../utils/media'

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, 'srcSet'> & { variant?: ImageVariant }

export function SiteImage({ src = '', variant = 'card', ...props }: Props) {
  return <ImageContent key={src} src={getImageUrl(src)} variant={variant} {...props} />
}

function ImageContent({ src = '', variant = 'card', alt = '', sizes, loading = 'lazy', decoding = 'async', onError, ...props }: Props) {
  const [failed, setFailed] = useState(0)
  const sources = imageSources(src, variant, import.meta.env.VITE_MEDIA_BASE_URL || '', import.meta.env.VITE_MEDIA_TRANSFORMS === 'true')
  if (!src || failed >= 2) return <span role="img" aria-label={alt || 'Görsel yok'} className={`inline-flex items-center justify-center bg-stone-100 text-stone-400 ${props.className || ''}`}><ImageOff aria-hidden="true" className="h-8 w-8" /></span>
  return <img {...props} {...(failed ? { src } : sources)} alt={alt} sizes={sizes || imageSizes[variant]} loading={loading} decoding={decoding} onError={event => {
    setFailed(failed === 0 && sources.src !== src ? 1 : 2)
    if (failed > 0 || sources.src === src) onError?.(event)
  }} />
}
