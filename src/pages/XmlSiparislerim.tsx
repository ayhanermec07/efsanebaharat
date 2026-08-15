import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ExternalLink, FileText, PackagePlus, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Order {
  id: string; siparis_no: string; toplam_tutar: number; siparis_durumu: string; odeme_durumu: string; olusturma_tarihi: string; receiptUrl?: string | null; siparis_fis_adi?: string | null
  items: Array<{ miktar: number; birim_turu: string; birim_adedi?: number; birim_adedi_turu?: string; toplam_fiyat: number; urunler?: { urun_adi?: string } | null }>
}
function status(order: Order) {
  if (order.odeme_durumu === 'fis_kontrol_bekliyor') return ['Fiş kontrolü bekliyor', 'bg-amber-100 text-amber-800']
  const values: Record<string, string[]> = { hazirlaniyor: ['Hazırlanıyor', 'bg-sky-100 text-sky-800'], kargoda: ['Kargoda', 'bg-violet-100 text-violet-800'], teslim_edildi: ['Teslim edildi', 'bg-emerald-100 text-emerald-800'], iptal_edildi: ['İptal edildi', 'bg-red-100 text-red-800'], beklemede: ['Onay bekliyor', 'bg-zinc-100 text-zinc-700'] }
  return values[order.siparis_durumu] || [order.siparis_durumu || 'İşleniyor', 'bg-zinc-100 text-zinc-700']
}

export default function XmlSiparislerim() {
  const navigate = useNavigate()
  const { user, musteriData, loading: authLoading } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    if (!authLoading && (!user || musteriData?.musteri_tipi !== 'xml_musteri')) { navigate('/giris'); return }
    if (user && musteriData?.musteri_tipi === 'xml_musteri') void loadOrders()
  }, [authLoading, musteriData?.musteri_tipi, navigate, user])
  async function loadOrders() {
    try { setLoading(true); const { data, error } = await supabase.functions.invoke('xml-musteri-siparis', { body: { action: 'list' } }); if (error || data?.error) throw new Error(data?.error?.message || error?.message || 'Siparişler yüklenemedi'); setOrders(data.data || []) } catch (error: any) { console.error(error); toast.error(error.message || 'Siparişler yüklenemedi') } finally { setLoading(false) }
  }
  return <main className="shop-container py-6 sm:py-8"><div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-violet-700">XML müşteri alanı</p><h1 className="mt-1 text-2xl font-bold text-zinc-950 sm:text-3xl">Sipariş geçmişim</h1><p className="mt-2 text-sm text-zinc-600">Gönderdiğiniz siparişleri ve işlem durumlarını buradan takip edin.</p></div><div className="flex gap-2"><button type="button" onClick={() => void loadOrders()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"><RefreshCw className="h-4 w-4" /> Yenile</button><button type="button" onClick={() => navigate('/xml-siparis')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"><PackagePlus className="h-4 w-4" /> Yeni sipariş</button></div></div>{loading ? <div className="py-16 text-center"><span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-violet-700 border-t-transparent" /></div> : orders.length === 0 ? <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-14 text-center"><FileText className="mx-auto mb-3 h-9 w-9 text-zinc-400" /><h2 className="font-bold text-zinc-900">Henüz sipariş yok</h2><p className="mt-1 text-sm text-zinc-600">İlk siparişinizi oluşturduktan sonra burada göreceksiniz.</p></div> : <div className="space-y-4">{orders.map((order) => { const [label, color] = status(order); return <article key={order.id} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-bold text-zinc-950">{order.siparis_no}</h2><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${color}`}>{label}</span></div><p className="mt-1 text-sm text-zinc-600">{new Date(order.olusturma_tarihi).toLocaleString('tr-TR')}</p></div><strong className="text-lg text-zinc-950">{Number(order.toplam_tutar).toFixed(2)} TL</strong></div><ul className="mt-4 space-y-1 border-t border-zinc-100 pt-3 text-sm text-zinc-700">{order.items.map((item, index) => <li key={index} className="flex flex-wrap justify-between gap-x-4 gap-y-1"><span>{item.miktar} × {item.urunler?.urun_adi || 'Ürün'} ({item.birim_adedi ? `${item.birim_adedi} ${item.birim_adedi_turu || item.birim_turu}` : item.birim_turu})</span><span>{Number(item.toplam_fiyat).toFixed(2)} TL</span></li>)}</ul>{order.receiptUrl && <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-violet-200 px-3 py-2 text-sm font-semibold text-violet-800 hover:bg-violet-50"><ExternalLink className="h-4 w-4" /> {order.siparis_fis_adi || 'Fişi aç'}</a>}</article> })}</div>}</main>
}
