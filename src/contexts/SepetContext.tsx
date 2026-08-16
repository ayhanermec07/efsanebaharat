/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import toast from 'react-hot-toast'

interface SepetItem {
  urun_id: string
  urun_adi: string
  birim_turu: string
  birim_adedi?: number
  birim_adedi_turu?: string
  birim_fiyat: number
  miktar: number
  gorsel_url?: string
  min_siparis_miktari?: number
}

interface SepetContextType {
  sepetItems: SepetItem[]
  sepeteEkle: (item: SepetItem) => void
  sepettenCikar: (urun_id: string, birim_turu: string, birim_adedi?: number) => void
  miktarGuncelle: (urun_id: string, birim_turu: string, miktar: number, birim_adedi?: number) => void
  sepetiTemizle: () => void
  toplamTutar: number
  toplamAdet: number
}

const SepetContext = createContext<SepetContextType | undefined>(undefined)

import { getImageUrl } from '../utils/imageUtils'

export function SepetProvider({ children }: { children: React.ReactNode }) {
  const { user, musteriData } = useAuth()
  const [sepetItems, setSepetItems] = useState<SepetItem[]>([])
  const [loading, setLoading] = useState(true)

  const stokKontrolVeRezerve = useCallback(async (
    urun_id: string,
    birim_turu: string,
    miktar: number,
    birim_adedi?: number,
    birim_adedi_turu?: string
  ) => {
    if (!musteriData?.id || musteriData.aktif_durum === false) return { success: false, message: 'Hesabınız yönetici onayı bekliyor' }

    try {
      const { data: stoklar, error: stokError } = await supabase
        .from('urun_stoklari')
        .select('stok_miktari, aktif_durum, stok_grubu, birim_adedi, birim_adedi_turu')
        .eq('urun_id', urun_id)
        .eq('birim_turu', birim_turu)

      if (stokError || !stoklar || stoklar.length === 0) {
        return { success: false, message: 'Stok bilgisi alınamadı' }
      }

      const musteriTipi = musteriData.musteri_tipi || 'musteri'
      const hedefBirimAdedi = Number(birim_adedi || 100)
      const hedefBirimAdediTuru = birim_adedi_turu || birim_turu
      const uygunStoklar = stoklar.filter(s =>
        Number(s.birim_adedi || 100) === hedefBirimAdedi &&
        (s.birim_adedi_turu || birim_turu) === hedefBirimAdediTuru
      )

      const stokData = uygunStoklar.find(s => s.stok_grubu === musteriTipi) ||
        uygunStoklar.find(s => s.stok_grubu === 'hepsi') ||
        uygunStoklar.find(s => !s.stok_grubu)

      if (!stokData) {
        return { success: false, message: 'Size uygun stok bulunamadı' }
      }

      if (!stokData.aktif_durum) {
        return { success: false, message: 'Bu ürün şu anda satışta değil' }
      }

      const { data: rezervasyonlar } = await supabase
        .from('stok_rezervasyonlari')
        .select('miktar')
        .eq('urun_id', urun_id)
        .eq('birim_turu', birim_turu)
        .eq('birim_adedi', hedefBirimAdedi)
        .gt('rezervasyon_tarihi', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

      const rezerveMiktar = rezervasyonlar?.reduce((sum, r) => sum + Number(r.miktar), 0) || 0
      const musaitMiktar = Number(stokData.stok_miktari) - rezerveMiktar

      const { data: mevcutRezervasyon } = await supabase
        .from('stok_rezervasyonlari')
        .select('miktar')
        .eq('musteri_id', musteriData.id)
        .eq('urun_id', urun_id)
        .eq('birim_turu', birim_turu)
        .eq('birim_adedi', hedefBirimAdedi)
        .maybeSingle()

      const mevcutMiktar = mevcutRezervasyon?.miktar || 0
      const eklenecekMiktar = miktar - mevcutMiktar

      if (musaitMiktar < eklenecekMiktar) {
        return {
          success: false,
          message: `Yeterli stok yok! Müsait: ${musaitMiktar}`
        }
      }

      if (mevcutRezervasyon) {
        await supabase
          .from('stok_rezervasyonlari')
          .update({
            miktar: miktar,
            rezervasyon_tarihi: new Date().toISOString()
          })
          .eq('musteri_id', musteriData.id)
          .eq('urun_id', urun_id)
          .eq('birim_turu', birim_turu)
          .eq('birim_adedi', hedefBirimAdedi)
      } else {
        await supabase
          .from('stok_rezervasyonlari')
          .insert({
            musteri_id: musteriData.id,
            urun_id: urun_id,
            birim_turu: birim_turu,
            birim_adedi: hedefBirimAdedi,
            birim_adedi_turu: hedefBirimAdediTuru,
            miktar: miktar
          })
      }

      return { success: true, message: 'Rezervasyon başarılı' }
    } catch (error) {
      console.error('Rezervasyon hatası:', error)
      return { success: false, message: 'Rezervasyon yapılamadı' }
    }
  }, [musteriData])

  // Veritabanına sepet ekleme
  const sepeteEkleDB = useCallback(async (item: SepetItem) => {
    if (!musteriData?.id || musteriData.aktif_durum === false) return

    try {
      const { data: existing } = await supabase
        .from('sepet_items')
        .select('*')
        .eq('musteri_id', musteriData.id)
        .eq('urun_id', item.urun_id)
        .eq('birim_turu', item.birim_turu)
        .eq('birim_adedi', item.birim_adedi || 100)
        .maybeSingle()

      const hedefMiktar = Number(existing?.miktar || 0) + Number(item.miktar)
      const rezervasyonSonuc = await stokKontrolVeRezerve(
        item.urun_id,
        item.birim_turu,
        hedefMiktar,
        item.birim_adedi,
        item.birim_adedi_turu
      )

      if (!rezervasyonSonuc.success) {
        throw new Error(rezervasyonSonuc.message)
      }

      if (existing) {
        await supabase
          .from('sepet_items')
          .update({ miktar: hedefMiktar })
          .eq('id', existing.id)
      } else {
        await supabase
          .from('sepet_items')
          .insert({
            musteri_id: musteriData.id,
            urun_id: item.urun_id,
            birim_turu: item.birim_turu,
            birim_adedi: item.birim_adedi,
            birim_adedi_turu: item.birim_adedi_turu,
            birim_fiyat: item.birim_fiyat,
            miktar: item.miktar
          })
      }
    } catch (error) {
      console.error('Sepete ekleme hatası:', error)
      throw error
    }
  }, [musteriData, stokKontrolVeRezerve])

  // Kullanıcı değiştiğinde sepeti yükle
  const loadCart = useCallback(async () => {
    setLoading(true)
    try {
      if (user && musteriData?.id && musteriData.aktif_durum !== false) {
        const { data, error } = await supabase
          .from('sepet_items')
          .select(`
            *,
            urunler:urun_id (
              urun_adi,
              ana_gorsel_url
            )
          `)
          .eq('musteri_id', musteriData.id)

        if (error) throw error

        const items: SepetItem[] = (data || []).map((item: any) => ({
          urun_id: item.urun_id,
          urun_adi: item.urunler?.urun_adi || '',
          birim_turu: item.birim_turu,
          birim_adedi: item.birim_adedi,
          birim_adedi_turu: item.birim_adedi_turu,
          birim_fiyat: Number(item.birim_fiyat),
          miktar: Number(item.miktar),
          gorsel_url: getImageUrl(item.urunler?.ana_gorsel_url),
          min_siparis_miktari: 1
        }))

        setSepetItems(items)

        const guestCart = localStorage.getItem('sepet_guest')
        if (guestCart) {
          const guestItems: SepetItem[] = JSON.parse(guestCart)
          for (const item of guestItems) {
            await sepeteEkleDB(item)
          }
          localStorage.removeItem('sepet_guest')
          await loadCart()
        }
      } else {
        setSepetItems([])
        localStorage.removeItem('sepet_guest')
      }
    } catch (error) {
      console.error('Sepet yükleme hatası:', error)
      toast.error('Sepet yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [musteriData, sepeteEkleDB, user])

  useEffect(() => {
    loadCart()
  }, [loadCart])

  // Önceki kullanıcı ID'sini takip et
  const [prevUserId, setPrevUserId] = useState<string | null>(user?.id || null)

  // Kullanıcı değiştiğinde (giriş/çıkış) kontrol et
  useEffect(() => {
    const currentUserId = user?.id || null

    // Kullanıcı değişti mi?
    if (prevUserId !== currentUserId) {
      if (prevUserId && !currentUserId) {
        // Çıkış yapıldı - sepeti temizle
        setSepetItems([])
        localStorage.removeItem('sepet_guest')
      }
      setPrevUserId(currentUserId)
    }
  }, [prevUserId, user])

  // Misafir sepetini localStorage'a kaydet
  useEffect(() => {
    if (!user && sepetItems.length > 0) {
      localStorage.setItem('sepet_guest', JSON.stringify(sepetItems))
    }
  }, [sepetItems, user])

  // Rezervasyonu kaldır
  const rezervasyonKaldir = async (urun_id: string, birim_turu: string, birim_adedi?: number) => {
    if (!musteriData?.id || musteriData.aktif_durum === false) return

    try {
      await supabase
        .from('stok_rezervasyonlari')
        .delete()
        .eq('musteri_id', musteriData.id)
        .eq('urun_id', urun_id)
        .eq('birim_turu', birim_turu)
        .eq('birim_adedi', Number(birim_adedi || 100))
    } catch (error) {
      console.error('Rezervasyon kaldırma hatası:', error)
    }
  }

  const sepeteEkle = async (item: SepetItem) => {
    if (user && musteriData?.id && musteriData.aktif_durum !== false) {
      // Giriş yapmış kullanıcı - veritabanına ekle
      try {
        await sepeteEkleDB(item)
        await loadCart()
        toast.success('Ürün sepete eklendi')
      } catch (error) {
        toast.error('Sepete eklenemedi')
      }
    } else {
      // Misafir kullanıcı - sepet işlemi yapamaz
      toast.error('Sepete eklemek için giriş yapmalısınız')
    }
  }

  const sepettenCikar = async (urun_id: string, birim_turu: string, birim_adedi?: number) => {
    if (user && musteriData?.id && musteriData.aktif_durum !== false) {
      // Giriş yapmış kullanıcı - veritabanından sil
      try {
        // Rezervasyonu kaldır
        await rezervasyonKaldir(urun_id, birim_turu, birim_adedi)

        // Let's rewrite the query construction properly
        let query = supabase
          .from('sepet_items')
          .delete()
          .eq('musteri_id', musteriData.id)
          .eq('urun_id', urun_id)
          .eq('birim_turu', birim_turu)

        if (birim_adedi) {
          query = query.eq('birim_adedi', birim_adedi)
        }

        await query
      } catch (error) {
        console.error('Sepetten çıkarma hatası:', error)
        toast.error('Ürün çıkarılamadı')
      }
    } else {
      // Misafir kullanıcı - işlem yok
      setSepetItems([])
    }
  }

  const miktarGuncelle = async (urun_id: string, birim_turu: string, miktar: number, birim_adedi?: number) => {
    if (miktar <= 0) {
      await sepettenCikar(urun_id, birim_turu, birim_adedi)
      return
    }

    if (user && musteriData?.id && musteriData.aktif_durum !== false) {
      // Giriş yapmış kullanıcı - veritabanında güncelle
      try {
        // Önce stok kontrolü ve rezervasyon güncelle
        const rezervasyonSonuc = await stokKontrolVeRezerve(urun_id, birim_turu, miktar, birim_adedi)

        if (!rezervasyonSonuc.success) {
          toast.error(rezervasyonSonuc.message)
          return
        }

        let query = supabase
          .from('sepet_items')
          .update({ miktar })
          .eq('musteri_id', musteriData.id)
          .eq('urun_id', urun_id)
          .eq('birim_turu', birim_turu)

        if (birim_adedi) {
          query = query.eq('birim_adedi', birim_adedi)
        }

        await query

        await loadCart()
      } catch (error) {
        console.error('Miktar güncelleme hatası:', error)
        toast.error('Miktar güncellenemedi')
      }
    } else {
      // Misafir kullanıcı - işlem yok
    }
  }

  const sepetiTemizle = async () => {
    if (user && musteriData?.id && musteriData.aktif_durum !== false) {
      // Giriş yapmış kullanıcı - veritabanından temizle
      try {
        // Tüm rezervasyonları kaldır
        await supabase
          .from('stok_rezervasyonlari')
          .delete()
          .eq('musteri_id', musteriData.id)

        // Sepeti temizle
        await supabase
          .from('sepet_items')
          .delete()
          .eq('musteri_id', musteriData.id)

        setSepetItems([])
      } catch (error) {
        console.error('Sepet temizleme hatası:', error)
        toast.error('Sepet temizlenemedi')
      }
    } else {
      // Misafir kullanıcı - işlem yok
      setSepetItems([])
      localStorage.removeItem('sepet_guest')
    }
  }

  const toplamTutar = sepetItems.reduce(
    (total, item) => total + item.birim_fiyat * item.miktar,
    0
  )

  const toplamAdet = sepetItems.reduce((total, item) => total + item.miktar, 0)

  return (
    <SepetContext.Provider
      value={{
        sepetItems,
        sepeteEkle,
        sepettenCikar,
        miktarGuncelle,
        sepetiTemizle,
        toplamTutar,
        toplamAdet
      }}
    >
      {children}
    </SepetContext.Provider>
  )
}

export function useSepet() {
  const context = useContext(SepetContext)
  if (context === undefined) {
    throw new Error('useSepet must be used within a SepetProvider')
  }
  return context
}
