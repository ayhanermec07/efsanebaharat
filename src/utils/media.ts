export type ImageVariant = 'thumb' | 'card' | 'detail' | 'hero'
const widths: Record<ImageVariant, number[]> = { thumb: [96, 320], card: [320, 640, 960], detail: [320, 640, 960, 1600], hero: [640, 960, 1600] }
export const imageSizes: Record<ImageVariant, string> = {
  thumb: '96px', card: '(min-width: 1280px) 240px, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw',
  detail: '(min-width: 1024px) 50vw, 100vw', hero: '(min-width: 768px) 50vw, 100vw',
}

export function imageSources(src: string, variant: ImageVariant, base: string, enabled: boolean): { src: string; srcSet?: string } {
  if (!src || !base || !enabled) return { src }
  try {
    const url = new URL(src), origin = new URL(base)
    if (url.origin !== origin.origin || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || !/^\/(urun-gorselleri|kategori-gorselleri|marka-logolari|banner-gorselleri|kampanya-banners|site-assets)\/[\w.-]+$/.test(url.pathname)) return { src }
    const resize = (width: number) => `${origin.origin}/cdn-cgi/image/width=${width},format=auto,quality=80,fit=scale-down${url.pathname}`
    return { src: resize(widths[variant][0]), srcSet: widths[variant].map(width => `${resize(width)} ${width}w`).join(', ') }
  } catch { return { src } }
}
