import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Package, ShoppingBag } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type DealerState = 'loading' | 'active' | 'inactive' | 'missing' | 'error'

export default function BayiPanel() {
  const { user, musteriData, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<DealerState>('loading')
  const [dealerName, setDealerName] = useState('')

  const loadDealer = useCallback(async () => {
    if (!user?.id) return
    setState('loading')
    const { data, error } = await supabase
      .from('bayiler')
      .select('bayi_adi, aktif')
      .eq('kullanici_id', user.id)
      .maybeSingle()
    if (error) { setState('error'); return }
    if (!data) { setState('missing'); return }
    setDealerName(data.bayi_adi || '')
    setState(data.aktif ? 'active' : 'inactive')
  }, [user?.id])

  useEffect(() => {
    if (authLoading) return
    if (!user || musteriData?.musteri_tipi !== 'bayi') {
      navigate('/giris')
      return
    }
    void loadDealer()
  }, [authLoading, user, musteriData?.musteri_tipi, navigate, loadDealer])

  if (authLoading || state === 'loading') {
    return <main className="shop-container py-16 text-center" role="status">Bayi hesabı yükleniyor…</main>
  }
  if (!user || musteriData?.musteri_tipi !== 'bayi') return null

  if (state !== 'active') {
    const message = state === 'inactive'
      ? 'Bayi hesabınız henüz aktif değil.'
      : state === 'missing'
        ? 'Bu hesaba bağlı bayi kaydı bulunamadı.'
        : 'Bayi hesabı şu anda doğrulanamadı.'
    return (
      <main className="shop-container py-12">
        <section className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold text-zinc-950">Bayi paneli</h1>
          <p className="mt-3 text-zinc-700" role="alert">{message}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {state === 'error' && <button type="button" onClick={() => void loadDealer()} className="shop-btn-primary min-h-11">Tekrar dene</button>}
            <Link to="/hesabim" className="shop-btn-secondary min-h-11">Hesabıma git</Link>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="shop-container py-8 sm:py-12">
      <div className="mb-6">
        <p className="text-sm font-semibold text-orange-700">Bayi hesabı aktif</p>
        <h1 className="mt-1 break-words text-3xl font-bold text-zinc-950">{dealerName || 'Bayi paneli'}</h1>
        <p className="mt-3 max-w-2xl text-zinc-600">Ürünleri ve satış birimlerini inceleyin. Kesin fiyat ve stok, sipariş sırasında doğrulanır.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Link to="/urunler" className="flex min-h-36 items-start gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-orange-300 hover:shadow-md">
          <ShoppingBag className="h-7 w-7 shrink-0 text-orange-700" aria-hidden="true" />
          <span className="min-w-0"><strong className="block text-lg text-zinc-950">Ürünleri incele</strong><span className="mt-1 block text-sm text-zinc-600">Satış seçeneklerini gör ve sepete ekle.</span></span>
        </Link>
        <Link to="/hesabim" className="flex min-h-36 items-start gap-4 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:border-orange-300 hover:shadow-md">
          <Package className="h-7 w-7 shrink-0 text-orange-700" aria-hidden="true" />
          <span className="min-w-0"><strong className="block text-lg text-zinc-950">Siparişlerim</strong><span className="mt-1 block text-sm text-zinc-600">Sipariş geçmişini ve teslimat bilgilerini görüntüle.</span></span>
        </Link>
      </div>
    </main>
  )
}
