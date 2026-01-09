// XML Generator Utility - Bayi XML Feed Sistemi

export interface XMLProduct {
    id: string
    name: string
    price: number
    stock: number
    unit: string
    unitAmount: number
    image: string
    category: string
    brand: string
    description?: string
}

/**
 * Ürün listesinden XML içeriği oluşturur
 */
export function generateXMLContent(products: XMLProduct[]): string {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?>'

    const productElements = products.map(product => {
        // HTML karakterlerini escape et
        const escapedName = escapeXML(product.name)
        const escapedCategory = escapeXML(product.category)
        const escapedBrand = escapeXML(product.brand)
        const escapedDescription = product.description ? escapeXML(product.description) : ''

        return `  <product>
    <id>${product.id}</id>
    <name>${escapedName}</name>
    <price>${product.price.toFixed(2)}</price>
    <stock>${product.stock}</stock>
    <unit>${product.unit}</unit>
    <unit_amount>${product.unitAmount}</unit_amount>
    <image>${product.image}</image>
    <category>${escapedCategory}</category>
    <brand>${escapedBrand}</brand>
    <description>${escapedDescription}</description>
  </product>`
    }).join('\n')

    return `${xmlHeader}
<products count="${products.length}" generated_at="${new Date().toISOString()}">
${productElements}
</products>`
}

/**
 * XML özel karakterlerini escape eder
 */
function escapeXML(str: string): string {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
}

/**
 * XML içeriğini dosya olarak indirir
 */
export function downloadXML(content: string, filename: string = 'products.xml'): void {
    const blob = new Blob([content], { type: 'application/xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
}

/**
 * Güvenli rastgele token oluşturur (64 karakter hex)
 */
export function generateSecureToken(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Token'ı kopyalamak için clipboard'a yazar
 */
export async function copyToClipboard(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text)
        return true
    } catch {
        // Fallback for older browsers
        const textArea = document.createElement('textarea')
        textArea.value = text
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
        return true
    }
}
