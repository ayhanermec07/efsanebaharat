import { useEffect, useState } from 'react'
import { PackageSearch } from 'lucide-react'
import type { CatalogCategory } from '../lib/catalog'
import { imageSources } from '../utils/media'

export default function CategoryBanner({ category }: { category: CatalogCategory }) {
  const [desktop, setDesktop] = useState(() => window.matchMedia('(min-width: 768px)').matches)
  const [failures, setFailures] = useState<Record<string, number>>({})
  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)')
    const update = () => setDesktop(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const src = (desktop ? category.banner_desktop_url : category.banner_mobile_url)?.trim() || ''
  const failed = failures[src] || 0
  const hasImage = !!src && failed < 2
  const sources = imageSources(src, 'hero', import.meta.env.VITE_MEDIA_BASE_URL || '', import.meta.env.VITE_MEDIA_TRANSFORMS === 'true')
  const description = category.aciklama?.trim()

  return <div className="shop-page-heading relative isolate overflow-hidden !p-0" data-category-banner={category.id}>
    {hasImage && <img key={`${src}:${failed}`} {...(failed ? { src } : sources)} sizes="(min-width: 768px) 50vw, calc(100vw - 32px)" alt="" aria-hidden="true" loading="eager" decoding="async" className="absolute inset-x-0 bottom-0 -z-10 h-[200px] w-full object-cover object-bottom [mask-image:linear-gradient(to_bottom,transparent,black_20%)] md:left-auto md:h-full md:w-1/2 md:object-right md:[mask-image:linear-gradient(to_right,transparent,black_20%)]" onError={() => setFailures(current => ({ ...current, [src]: failed === 0 && sources.src !== src ? 1 : 2 }))} />}
    <div className={`relative flex flex-col p-5 sm:p-7 ${hasImage ? 'min-h-[320px] pb-[200px] sm:pb-[200px] md:min-h-[220px] md:pb-7' : ''}`}>
      <div className={`min-w-0 ${hasImage ? 'md:w-1/2' : ''}`}>
        <div className="shop-eyebrow"><PackageSearch className="h-4 w-4 shrink-0" />Ürün kataloğu</div>
        <h1 className="mt-3 break-words text-3xl font-bold sm:text-4xl">{category.kategori_adi}</h1>
        {description && <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-brand-muted sm:text-base">{description}</p>}
      </div>
    </div>
  </div>
}
