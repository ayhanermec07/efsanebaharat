// Ürün detay sayfası için başlık, açıklama, paylaşım görseli ve Google ürün
// bilgisi (schema.org Product JSON-LD). Sayfadan çıkınca temizlenir.

export type ProductSeoInput = {
  name: string
  description?: string | null
  brand?: string | null
  category?: string | null
  image?: string | null
  price?: number | null
  sku?: string | null
  gtin?: string | null
  inStock: boolean
  url: string
}

const JSON_LD_ID = 'product-jsonld'

function setMeta(key: 'name' | 'property', value: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${key}="${value}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(key, value)
    document.head.appendChild(element)
  }
  element.content = content
}

export function productDescription(input: Pick<ProductSeoInput, 'name' | 'description' | 'brand' | 'category'>) {
  const own = input.description?.replace(/\s+/g, ' ').trim()
  if (own) return own.length > 160 ? `${own.slice(0, 157).trimEnd()}...` : own
  const parts = [input.brand, input.category].filter(Boolean).join(' · ')
  return `${input.name}${parts ? ` (${parts})` : ''} Efsane Baharat'ta. Güvenli ödeme ve hızlı kargo ile sipariş verin.`
}

export function productJsonLd(input: ProductSeoInput) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: productDescription(input),
    url: input.url
  }
  if (input.image) data.image = [input.image]
  if (input.brand) data.brand = { '@type': 'Brand', name: input.brand }
  if (input.category) data.category = input.category
  if (input.sku) data.sku = input.sku
  if (input.gtin && /^\d{8,14}$/.test(input.gtin)) data.gtin = input.gtin
  if (input.price && input.price > 0) {
    data.offers = {
      '@type': 'Offer',
      url: input.url,
      priceCurrency: 'TRY',
      price: input.price.toFixed(2),
      availability: input.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition'
    }
  }
  return data
}

export function applyProductSeo(input: ProductSeoInput) {
  document.title = `${input.name} | Efsane Baharat`
  const description = productDescription(input)
  setMeta('name', 'description', description)
  setMeta('property', 'og:title', input.name)
  setMeta('property', 'og:description', description)
  setMeta('property', 'og:type', 'product')
  if (input.image) setMeta('property', 'og:image', input.image)

  let script = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null
  if (!script) {
    script = document.createElement('script')
    script.type = 'application/ld+json'
    script.id = JSON_LD_ID
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(productJsonLd(input))
}

export function clearProductSeo() {
  document.getElementById(JSON_LD_ID)?.remove()
  document.head.querySelector('meta[property="og:image"]')?.remove()
  const ogType = document.head.querySelector<HTMLMetaElement>('meta[property="og:type"]')
  if (ogType) ogType.content = 'website'
}
