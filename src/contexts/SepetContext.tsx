/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { getImageUrl } from '../utils/imageUtils'
import {
  cartFailure,
  classifyCartError,
  validateCartQuantity,
  type CartCommandResult,
} from '../lib/cart-commands'

export type { CartCommandResult, CartFailureReason } from '../lib/cart-commands'

interface SepetItem { stok_varyant_id: string; urun_id: string; urun_adi: string; birim_turu: string; birim_adedi?: number; birim_adedi_turu?: string; birim_fiyat: number; miktar: number; gorsel_url?: string; min_siparis_miktari?: number }
interface SepetContextType {
  sepetItems: SepetItem[]
  sepetYukleniyor: boolean
  sepetHatasi: string | null
  bekleyenStoklar: ReadonlySet<string>
  sepeteEkle: (item: SepetItem) => Promise<CartCommandResult>
  sepettenCikar: (stokVaryantId: string) => Promise<CartCommandResult>
  miktarGuncelle: (stokVaryantId: string, miktar: number) => Promise<CartCommandResult>
  sepetiTemizle: () => Promise<CartCommandResult>
  sepetiYenile: () => Promise<boolean>
  toplamTutar: number
  toplamAdet: number
}
const SepetContext = createContext<SepetContextType | undefined>(undefined)

const CLEAR_LOCK = '*'
const SYNC_KEY = 'efsane-sepet-surumu'
const isPieceUnit = (unit?: string) => (unit || '').trim().toLowerCase() === 'adet'
const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false

export function SepetProvider({ children }: { children: React.ReactNode }) {
  const { user, musteriData } = useAuth()
  const [sepetItems, setSepetItems] = useState<SepetItem[]>([])
  const [sepetYukleniyor, setSepetYukleniyor] = useState(false)
  const [sepetHatasi, setSepetHatasi] = useState<string | null>(null)
  const [bekleyenStoklar, setBekleyenStoklar] = useState<ReadonlySet<string>>(() => new Set())
  const locks = useRef(new Set<string>())
  const loadSequence = useRef(0)

  const customerId = musteriData?.id
  const customerInactive = musteriData?.aktif_durum === false

  // Sepet durumu yalnız sunucudaki satırlardan kurulur; hata durumunda son
  // doğrulanmış liste korunur ve hata ayrıca gösterilir.
  const loadCart = useCallback(async (): Promise<boolean> => {
    const sequence = ++loadSequence.current
    if (!user || !customerId || customerInactive) {
      setSepetItems([])
      setSepetHatasi(null)
      return true
    }
    setSepetYukleniyor(true)
    const { data, error } = await supabase
      .from('sepet_items')
      .select('*, urunler:urun_id(urun_adi,ana_gorsel_url)')
      .eq('musteri_id', customerId)
    if (sequence !== loadSequence.current) return !error
    setSepetYukleniyor(false)
    if (error) {
      setSepetHatasi('Sepet yüklenemedi. Gösterilen liste güncel olmayabilir.')
      return false
    }
    setSepetHatasi(null)
    setSepetItems((data || []).map((row: any) => ({
      ...row,
      stok_varyant_id: row.stok_varyant_id,
      urun_adi: row.urunler?.urun_adi || '',
      birim_fiyat: Number(row.birim_fiyat),
      miktar: Number(row.miktar),
      gorsel_url: getImageUrl(row.urunler?.ana_gorsel_url),
      // Minimum kuralı sunucuda (set_cart_item) uygulanır; yetersizse özel hata döner.
      min_siparis_miktari: 1,
    })))
    return true
  }, [customerId, customerInactive, user])

  useEffect(() => { void loadCart() }, [loadCart])

  // İki sekme: odak/görünürlük değişiminde ve diğer sekmenin mutation
  // sinyalinde sunucu sepeti yeniden okunur.
  useEffect(() => {
    const reload = () => { if (document.visibilityState !== 'hidden') void loadCart() }
    const onStorage = (event: StorageEvent) => { if (event.key === SYNC_KEY) void loadCart() }
    window.addEventListener('focus', reload)
    document.addEventListener('visibilitychange', reload)
    window.addEventListener('storage', onStorage)
    return () => {
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', reload)
      window.removeEventListener('storage', onStorage)
    }
  }, [loadCart])

  const announceChange = () => {
    try { window.localStorage.setItem(SYNC_KEY, String(Date.now())) } catch { /* depolama kapalı olabilir */ }
  }

  const precheck = useCallback((): CartCommandResult | null => {
    if (!user || !customerId) return cartFailure('auth_required')
    if (customerInactive) return cartFailure('account_inactive')
    if (!isOnline()) return cartFailure('network')
    return null
  }, [customerId, customerInactive, user])

  const runCommand = useCallback(async (
    lockKey: string,
    command: () => PromiseLike<{ error: any }>,
  ): Promise<CartCommandResult> => {
    const blocked = precheck()
    if (blocked) return blocked
    if (locks.current.has(lockKey) || locks.current.has(CLEAR_LOCK)) return cartFailure('busy')
    locks.current.add(lockKey)
    setBekleyenStoklar(new Set(locks.current))
    try {
      let error: any
      try {
        ({ error } = await command())
      } catch (thrown) {
        error = thrown
      }
      // Başarı da hata da sunucu sepetiyle yakınsar; iyimser state tutulmaz.
      await loadCart()
      if (error) return cartFailure(classifyCartError(error, isOnline()))
      announceChange()
      return { ok: true }
    } finally {
      locks.current.delete(lockKey)
      setBekleyenStoklar(new Set(locks.current))
    }
  }, [loadCart, precheck])

  const notify = (result: CartCommandResult) => {
    if ('reason' in result) toast.error(result.message, { id: `sepet-${result.reason}` })
    return result
  }

  const sepeteEkle = async (item: SepetItem) => {
    const invalid = validateCartQuantity(Number(item.miktar), isPieceUnit(item.birim_turu), 0.001)
    if (invalid) return notify(cartFailure(invalid))
    const result = await runCommand(item.stok_varyant_id, () =>
      supabase.rpc('add_cart_item', { p_stok_varyant_id: item.stok_varyant_id, p_miktar: Number(item.miktar) }))
    if (result.ok) toast.success('Ürün sepete eklendi')
    return notify(result)
  }

  const sepettenCikar = async (stokVaryantId: string) => {
    const result = await runCommand(stokVaryantId, () =>
      supabase.rpc('remove_cart_item', { p_stok_varyant_id: stokVaryantId }))
    return notify(result)
  }

  const miktarGuncelle = async (stokVaryantId: string, miktar: number) => {
    const item = sepetItems.find((candidate) => candidate.stok_varyant_id === stokVaryantId)
    if (!item) {
      await loadCart()
      return notify(cartFailure('not_in_cart'))
    }
    if (miktar <= 0) return sepettenCikar(stokVaryantId)
    const invalid = validateCartQuantity(Number(miktar), isPieceUnit(item.birim_turu), Number(item.min_siparis_miktari || 1))
    if (invalid) return notify(cartFailure(invalid))
    const result = await runCommand(stokVaryantId, () =>
      supabase.rpc('set_cart_item', { p_stok_varyant_id: stokVaryantId, p_miktar: Number(miktar) }))
    return notify(result)
  }

  const sepetiTemizle = async () => {
    if (!user) { setSepetItems([]); return { ok: true } as const }
    if (locks.current.size > 0) return notify(cartFailure('busy'))
    const result = await runCommand(CLEAR_LOCK, () => supabase.rpc('clear_cart_items'))
    return notify(result)
  }

  const toplamTutar = sepetItems.reduce((sum, item) => sum + item.birim_fiyat * item.miktar, 0)
  const toplamAdet = sepetItems.reduce((sum, item) => sum + item.miktar, 0)
  return (
    <SepetContext.Provider value={{
      sepetItems, sepetYukleniyor, sepetHatasi, bekleyenStoklar,
      sepeteEkle, sepettenCikar, miktarGuncelle, sepetiTemizle, sepetiYenile: loadCart,
      toplamTutar, toplamAdet,
    }}>
      {children}
    </SepetContext.Provider>
  )
}
export function useSepet() { const context = useContext(SepetContext); if (!context) throw new Error('useSepet must be used within a SepetProvider'); return context }
