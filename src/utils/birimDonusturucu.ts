// Birim dönüştürme ve hesaplama utility'si

export interface BirimInfo {
  birim: string
  gramCinsinden: number // Gram cinsinden değer
  goruntuleme: string
}

// Desteklenen birimler
export const BIRIMLER: BirimInfo[] = [
  { birim: 'adet', gramCinsinden: 1, goruntuleme: 'Adet' },
  { birim: 'gram', gramCinsinden: 1, goruntuleme: 'Gram' },
  { birim: 'kilogram', gramCinsinden: 1000, goruntuleme: 'Kilogram' }
]

// Birim türü seçenekleri
export const BIRIM_TURLERI = [
  { value: 'adet', label: 'Adet' },
  { value: 'gram', label: 'Gram' },
  { value: 'kilogram', label: 'Kilogram' }
]

// Gram bazlı birimler için ek seçenekler
export const GRAM_BIRIMLERI = [
  { value: 'gram', label: 'Gram', carpan: 1 },
  { value: 'kilogram', label: 'Kilogram', carpan: 1000 }
]

/**
 * Birim dönüştürme fonksiyonu
 * gr, kg, gram, kilogram gibi farklı yazımları destekler
 */
export function birimDonustur(
  miktar: number,
  kaynakBirim: string,
  hedefBirim: string
): number {
  // Birim normalizasyonu
  const normalizeEdilmisKaynak = normalizeBirim(kaynakBirim)
  const normalizeEdilmisHedef = normalizeBirim(hedefBirim)
  
  const kaynak = BIRIMLER.find(b => b.birim === normalizeEdilmisKaynak)
  const hedef = BIRIMLER.find(b => b.birim === normalizeEdilmisHedef)
  
  if (!kaynak || !hedef) {
    return miktar // Dönüştürme yapılamıyorsa orijinal değeri döndür
  }
  
  // Önce gram cinsine çevir, sonra hedef birime
  const gramCinsinden = miktar * kaynak.gramCinsinden
  return gramCinsinden / hedef.gramCinsinden
}

/**
 * Birim normalizasyonu (gr → gram, kg → kilogram)
 */
function normalizeBirim(birim: string): string {
  const birimLower = birim.toLowerCase()
  if (birimLower === 'gr' || birimLower === 'gram') return 'gram'
  if (birimLower === 'kg' || birimLower === 'kilogram') return 'kilogram'
  if (birimLower === 'adet') return 'adet'
  return birim
}

/**
 * Stok hesaplama fonksiyonu
 * Örnek: 10 kg stok, 250 gr satış → 9.75 kg
 */
export function stokHesapla(
  mevcutStok: number,
  stokBirimi: string,
  satilanMiktar: number,
  satisBirimi: string,
  birimAdedi: number
): { yeniStok: number, birim: string } {
  // Satılan toplam miktarı hesapla (birim adedi * satılan miktar)
  const toplamSatilanMiktar = birimAdedi * satilanMiktar
  
  // Satılan miktarı stok birimine çevir
  const donusturulenSatis = birimDonustur(toplamSatilanMiktar, satisBirimi, stokBirimi)
  
  return {
    yeniStok: Math.max(0, mevcutStok - donusturulenSatis),
    birim: stokBirimi
  }
}

/**
 * Birim uyumluluğu kontrolü
 */
export function birimUyumluMu(birim1: string, birim2: string): boolean {
  const norm1 = normalizeBirim(birim1)
  const norm2 = normalizeBirim(birim2)
  
  // Adet sadece adet ile uyumlu
  if (norm1 === 'adet' || norm2 === 'adet') {
    return norm1 === norm2
  }
  
  // Gram ve kilogram birbirleriyle uyumlu
  const agirlikBirimleri = ['gram', 'kilogram']
  return agirlikBirimleri.includes(norm1) && agirlikBirimleri.includes(norm2)
}

/**
 * Akıllı birim gösterimi
 */
export function akilliBirimGoster(miktar: number, birim: string): string {
  const normBirim = normalizeBirim(birim)
  
  if (normBirim === 'adet') {
    return `${miktar} Adet`
  }
  
  if (normBirim === 'gram' || birim.toLowerCase() === 'gr') {
    if (miktar >= 1000 && miktar % 1000 === 0) {
      return `${miktar / 1000} Kg`
    }
    return `${miktar} Gr`
  }
  
  if (normBirim === 'kilogram' || birim.toLowerCase() === 'kg') {
    if (miktar < 1) {
      return `${miktar * 1000} Gr`
    }
    return `${miktar} Kg`
  }
  
  return `${miktar} ${birim}`
}

/**
 * Ondalık stok gösterimi
 */
export function ondalikStokGoster(stok: number, birim: string): string {
  const normBirim = normalizeBirim(birim)
  
  if (normBirim === 'adet') {
    return `${Math.floor(stok)} Adet`
  }
  
  if (normBirim === 'gram' || birim.toLowerCase() === 'gr') {
    if (stok >= 1000) {
      const kg = stok / 1000
      return `${kg.toFixed(3)} Kg (${stok.toFixed(1)} Gr)`
    }
    return `${stok.toFixed(1)} Gr`
  }
  
  if (normBirim === 'kilogram' || birim.toLowerCase() === 'kg') {
    return `${stok.toFixed(3)} Kg`
  }
  
  return `${stok.toFixed(2)} ${birim}`
}

/**
 * Birim seçeneklerini getir
 */
export function getBirimSecenekleri(anaBirim: string): Array<{value: string, label: string}> {
  if (anaBirim === 'adet') {
    return [{ value: 'adet', label: 'Adet' }]
  }
  
  if (anaBirim === 'gram' || anaBirim === 'kilogram') {
    return GRAM_BIRIMLERI
  }
  
  return BIRIM_TURLERI
}
