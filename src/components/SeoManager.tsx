import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { seoForPath } from '../lib/seo'

function meta(key: 'name' | 'property', value: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${value}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(key, value)
    document.head.appendChild(element)
  }
  element.content = content
}

export default function SeoManager() {
  const { pathname } = useLocation()

  useEffect(() => {
    const seo = seoForPath(pathname, window.location.origin)
    document.title = seo.title
    meta('name', 'description', seo.description)
    meta('name', 'robots', seo.robots)
    meta('property', 'og:title', seo.title)
    meta('property', 'og:description', seo.description)
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const ogUrl = document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')
    if (seo.canonical) {
      if (!canonical) {
        canonical = document.createElement('link')
        canonical.rel = 'canonical'
        document.head.appendChild(canonical)
      }
      canonical.href = seo.canonical
      meta('property', 'og:url', seo.canonical)
    } else {
      canonical?.remove()
      ogUrl?.remove()
    }
  }, [pathname])

  return null
}
