
/**
 * Veritabanından gelen görsel URL'lerini temizler.
 * Özellikle localhost ile başlayan URL'leri göreceli yollara çevirir.
 */
export function getImageUrl(url: string | null | undefined): string {
    if (!url) return ''

    // Eğer URL http:// veya https:// ile başlıyorsa
    if (url.startsWith('http')) {
        // Localhost referanslarını temizle ve göreceli yol yap
        if (url.includes('localhost:5174') || url.includes('localhost:3000')) {
            return url.replace(/^https?:\/\/localhost:\d+/, '')
        }
    }

    return url
}
