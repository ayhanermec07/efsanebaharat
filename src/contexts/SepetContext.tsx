/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { getImageUrl } from '../utils/imageUtils'

interface SepetItem { stok_varyant_id: string; urun_id: string; urun_adi: string; birim_turu: string; birim_adedi?: number; birim_adedi_turu?: string; birim_fiyat: number; miktar: number; gorsel_url?: string; min_siparis_miktari?: number }
interface SepetContextType { sepetItems: SepetItem[]; sepeteEkle: (item: SepetItem) => void; sepettenCikar: (urunId: string, birimTuru: string, birimAdedi?: number) => void; miktarGuncelle: (urunId: string, birimTuru: string, miktar: number, birimAdedi?: number) => void; sepetiTemizle: () => void; toplamTutar: number; toplamAdet: number }
const SepetContext = createContext<SepetContextType | undefined>(undefined)

export function SepetProvider({ children }: { children: React.ReactNode }) {
  const { user, musteriData } = useAuth(); const [sepetItems, setSepetItems] = useState<SepetItem[]>([])
  const loadCart = useCallback(async () => {
    if (!user || !musteriData?.id || musteriData.aktif_durum === false) { setSepetItems([]); return }
    const { data, error } = await supabase.from('sepet_items').select('*, urunler:urun_id(urun_adi,ana_gorsel_url)').eq('musteri_id', musteriData.id)
    if (error) { toast.error('Sepet yüklenemedi'); return }
    setSepetItems((data || []).map((row: any) => ({ ...row, stok_varyant_id: row.stok_varyant_id, urun_adi: row.urunler?.urun_adi || '', birim_fiyat: Number(row.birim_fiyat), miktar: Number(row.miktar), gorsel_url: getImageUrl(row.urunler?.ana_gorsel_url), min_siparis_miktari: 1 })))
  }, [musteriData?.id, musteriData?.aktif_durum, user])
  useEffect(() => { void loadCart() }, [loadCart])
  const setCartItem = useCallback(async (stockId: string, quantity: number) => { const { error } = await supabase.rpc('set_cart_item', { p_stok_varyant_id: stockId, p_miktar: quantity }); if (error) throw error }, [])
  const find = (urunId: string, birimTuru: string, birimAdedi?: number) => sepetItems.find(i => i.urun_id === urunId && i.birim_turu === birimTuru && Number(i.birim_adedi || 100) === Number(birimAdedi || 100))
  const sepeteEkle = async (item: SepetItem) => { if (!user || !musteriData?.id || musteriData.aktif_durum === false) { toast.error('Sepete eklemek için giriş yapmalısınız'); return }; try { const old = sepetItems.find(i => i.stok_varyant_id === item.stok_varyant_id); await setCartItem(item.stok_varyant_id, Number(old?.miktar || 0) + Number(item.miktar)); await loadCart(); toast.success('Ürün sepete eklendi') } catch { toast.error('Sepete eklenemedi') } }
  const sepettenCikar = async (urunId: string, birimTuru: string, birimAdedi?: number) => { const item = find(urunId, birimTuru, birimAdedi); if (!item) return; const { error } = await supabase.rpc('remove_cart_item', { p_stok_varyant_id: item.stok_varyant_id }); if (error) { toast.error('Ürün çıkarılamadı'); return }; await loadCart() }
  const miktarGuncelle = async (urunId: string, birimTuru: string, miktar: number, birimAdedi?: number) => { const item = find(urunId, birimTuru, birimAdedi); if (!item) return; if (miktar <= 0) { await sepettenCikar(urunId, birimTuru, birimAdedi); return }; try { await setCartItem(item.stok_varyant_id, miktar); await loadCart() } catch { toast.error('Miktar güncellenemedi') } }
  const sepetiTemizle = async () => { if (!user) { setSepetItems([]); return }; const { error } = await supabase.rpc('clear_cart_items'); if (error) { toast.error('Sepet temizlenemedi'); return }; setSepetItems([]) }
  const toplamTutar = sepetItems.reduce((sum, item) => sum + item.birim_fiyat * item.miktar, 0); const toplamAdet = sepetItems.reduce((sum, item) => sum + item.miktar, 0)
  return <SepetContext.Provider value={{ sepetItems, sepeteEkle, sepettenCikar, miktarGuncelle, sepetiTemizle, toplamTutar, toplamAdet }}>{children}</SepetContext.Provider>
}
export function useSepet() { const context = useContext(SepetContext); if (!context) throw new Error('useSepet must be used within a SepetProvider'); return context }
