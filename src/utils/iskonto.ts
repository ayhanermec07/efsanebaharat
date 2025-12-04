import { supabase } from '../lib/supabase'

export interface IskontoInfo {
  varMi: boolean
  oran: number
  yeniFiyat: number
  eskiFiyat: number
}

/**
 * Kullanıcının aktif iskontosunu kontrol eder
 */
export async function kullaniciIskontosuKontrol(musteriId: string): Promise<number> {
  try {
    const bugun = new Date().toISOString().split('T')[0] // Sadece tarih kısmı
    
    // Bireysel iskonto kontrolü
    const { data: bireyselIskonto } = await supabase
      .from('iskontolar')
      .select('iskonto_orani')
      .eq('hedef_id', musteriId)
      .eq('hedef_tipi', 'musteri')
      .eq('aktif', true)
      .lte('baslangic_tarihi', bugun)
      .gte('bitis_tarihi', bugun)
      .order('iskonto_orani', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (bireyselIskonto) {
      return bireyselIskonto.iskonto_orani
    }
    
    // Müşteri bilgisini al
    const { data: musteri } = await supabase
      .from('musteriler')
      .select('fiyat_grubu_id')
      .eq('id', musteriId)
      .maybeSingle()
    
    if (musteri?.fiyat_grubu_id) {
      // Grup iskonto kontrolü
      const { data: grupIskonto } = await supabase
        .from('iskontolar')
        .select('iskonto_orani')
        .eq('hedef_id', musteri.fiyat_grubu_id)
        .eq('hedef_tipi', 'grup')
        .eq('aktif', true)
        .lte('baslangic_tarihi', bugun)
        .gte('bitis_tarihi', bugun)
        .order('iskonto_orani', { ascending: false })
        .limit(1)
        .maybeSingle()
      
      if (grupIskonto) {
        return grupIskonto.iskonto_orani
      }
    }
    
    return 0
  } catch (error) {
    console.error('İskonto kontrolü hatası:', error)
    return 0
  }
}

/**
 * Ürün fiyatına iskonto uygular
 */
export function iskontoUygula(fiyat: number, iskontoOrani: number): IskontoInfo {
  if (iskontoOrani <= 0 || iskontoOrani > 100) {
    return {
      varMi: false,
      oran: 0,
      yeniFiyat: fiyat,
      eskiFiyat: fiyat
    }
  }

  const indirim = (fiyat * iskontoOrani) / 100
  const yeniFiyat = fiyat - indirim

  return {
    varMi: true,
    oran: iskontoOrani,
    yeniFiyat: Math.round(yeniFiyat * 100) / 100,
    eskiFiyat: fiyat
  }
}

/**
 * Kademeli iskonto uygular (önce grup, sonra özel)
 */
export function kademeliIskontoUygula(
  fiyat: number, 
  grupIskontoOrani: number, 
  ozelIskontoOrani: number
): IskontoInfo {
  if (grupIskontoOrani <= 0 && ozelIskontoOrani <= 0) {
    return {
      varMi: false,
      oran: 0,
      yeniFiyat: fiyat,
      eskiFiyat: fiyat
    }
  }

  let mevcutFiyat = fiyat
  let toplamIndirim = 0

  // 1. Grup iskontosunu uygula
  if (grupIskontoOrani > 0) {
    const grupIndirim = (mevcutFiyat * grupIskontoOrani) / 100
    toplamIndirim += grupIndirim
    mevcutFiyat -= grupIndirim
  }

  // 2. Özel iskontonu uygula (kalan tutara)
  if (ozelIskontoOrani > 0) {
    const ozelIndirim = (mevcutFiyat * ozelIskontoOrani) / 100
    toplamIndirim += ozelIndirim
    mevcutFiyat -= ozelIndirim
  }

  // Toplam iskonto oranını hesapla
  const toplamIskontoOrani = (toplamIndirim / fiyat) * 100

  return {
    varMi: true,
    oran: Math.round(toplamIskontoOrani * 100) / 100,
    yeniFiyat: Math.round(mevcutFiyat * 100) / 100,
    eskiFiyat: fiyat
  }
}
