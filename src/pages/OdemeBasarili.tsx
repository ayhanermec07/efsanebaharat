import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { AlertCircle, CheckCircle, Clock3, RefreshCw } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import BankTransferDetails from '../components/BankTransferDetails'
import type { BankDetails } from '../lib/payment-methods'
import { formatPrice } from '../lib/currency'
import { supabase } from '../lib/supabase'
import OrderDocument from '../components/OrderDocument'

type PaymentState = 'loading' | 'missing' | 'unauthenticated' | 'not_found' | 'transfer' | 'pending' | 'failed' | 'paid' | 'error'

export default function OdemeBasarili() {
  const { user, musteriData, loading: authLoading } = useAuth()
  const [searchParams] = useSearchParams()
  const orderId = searchParams.get('order_id')
  const [order, setOrder] = useState<{ bank_details: BankDetails; siparis_no: string; toplam_tutar: number } | null>(null)
  const [state, setState] = useState<PaymentState>('loading')

  const loadOrder = useCallback(async () => {
    if (!orderId) { setState('missing'); return }
    if (!user || !musteriData?.id) { setState('unauthenticated'); return }
    setState('loading')
    setOrder(null)
    const { data, error } = await supabase
      .from('siparisler')
      .select('odeme_durumu, stok_dusuldu, payment_method, bank_details, siparis_durumu, siparis_no, toplam_tutar')
      .eq('id', orderId)
      .eq('musteri_id', musteriData.id)
      .maybeSingle()
    if (error) { setState('error'); return }
    if (!data) { setState('not_found'); return }
    setOrder(data)
    if (data.siparis_durumu === 'iptal_edildi') { setState('failed'); return }
    if (data.odeme_durumu === 'odendi' && data.stok_dusuldu === true) { setState('paid'); return }
    if (data.odeme_durumu === 'basarisiz' || data.odeme_durumu === 'iptal') { setState('failed'); return }
    setState(data.payment_method === 'havale' ? 'transfer' : 'pending')
  }, [musteriData?.id, orderId, user])

  useEffect(() => {
    if (!authLoading) void loadOrder()
  }, [authLoading, loadOrder])

  const content = {
    transfer: { icon: Clock3, iconClass: 'bg-amber-100 text-amber-600', title: 'Siparişiniz alındı — havale bekleniyor', message: 'Aşağıdaki hesaba sipariş tutarını gönderin. Ödemeniz onaylanınca siparişiniz hazırlanacak.' },
    paid: { icon: CheckCircle, iconClass: 'bg-green-100 text-green-600', title: 'Ödeme onaylandı', message: 'Siparişiniz başarıyla oluşturuldu. Ödemeniz onaylandı ve hazırlık süreci başlayacak.' },
    pending: { icon: Clock3, iconClass: 'bg-amber-100 text-amber-600', title: 'Ödeme onayı bekleniyor', message: 'Ödeme sağlayıcısından kesin sonuç bekleniyor. Sayfayı yenileyerek durumu tekrar kontrol edebilirsiniz.' },
    failed: { icon: AlertCircle, iconClass: 'bg-red-100 text-red-600', title: 'Ödeme tamamlanmadı', message: 'Bu sipariş için başarılı bir ödeme onayı bulunmuyor. Sepetinizi kontrol edip tekrar deneyebilirsiniz.' },
    missing: { icon: AlertCircle, iconClass: 'bg-zinc-100 text-zinc-600', title: 'Sipariş doğrulanamadı', message: 'Dönüş bağlantısında sipariş bilgisi bulunmuyor.' },
    unauthenticated: { icon: AlertCircle, iconClass: 'bg-zinc-100 text-zinc-600', title: 'Giriş gerekli', message: 'Ödeme durumunu görmek için siparişi veren hesapla giriş yapmalısınız.' },
    not_found: { icon: AlertCircle, iconClass: 'bg-zinc-100 text-zinc-600', title: 'Sipariş bulunamadı', message: 'Bu hesap için eşleşen bir sipariş bulunamadı.' },
    error: { icon: AlertCircle, iconClass: 'bg-red-100 text-red-600', title: 'Durum alınamadı', message: 'Ödeme durumunu şu anda doğrulayamadık. Lütfen tekrar deneyin.' },
  }[state === 'loading' ? 'pending' : state]
  const Icon = content.icon

  return (
    <main className="shop-container py-10 sm:py-16">
      <section className="mx-auto max-w-md rounded-lg bg-white p-6 text-center shadow-sm sm:p-8">
        {authLoading || state === 'loading' ? <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-brand border-t-transparent" aria-label="Ödeme durumu yükleniyor" /> : <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${content.iconClass}`}><Icon className="h-12 w-12" aria-hidden="true" /></div>}
        <h1 className="text-2xl font-bold text-gray-900">{authLoading || state === 'loading' ? 'Ödeme durumu kontrol ediliyor' : content.title}</h1>
        <p className="mt-4 text-gray-600">{authLoading || state === 'loading' ? 'Lütfen bekleyin.' : content.message}</p>
        {state === 'transfer' && order && <div className="mt-6 space-y-4"><p className="break-words font-bold">Sipariş: {order.siparis_no}<br />Gönderilecek tutar: {formatPrice(order.toplam_tutar)}</p><BankTransferDetails details={order.bank_details} reference={order.siparis_no} /></div>}
        <div className="mt-8 space-y-3">
          {order&&orderId&&<OrderDocument orderId={orderId} orderNumber={order.siparis_no}/>}
          {state === 'transfer' || state === 'pending' || state === 'error' ? <button type="button" onClick={() => void loadOrder()} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand py-3 text-white transition hover:bg-emerald-800"><RefreshCw className="h-4 w-4" /> Durumu yenile</button> : null}
          {state === 'unauthenticated' ? <Link to="/giris?redirect=/hesabim" className="block w-full rounded-lg bg-brand py-3 text-white transition hover:bg-emerald-800">Giriş yap</Link> : null}
          {state === 'paid' || state === 'transfer' ? <Link to="/hesabim" className="block w-full rounded-lg bg-brand py-3 text-white transition hover:bg-emerald-800">Siparişlerimi görüntüle</Link> : null}
          <Link to={state === 'failed' ? '/sepet' : '/urunler'} className="block w-full rounded-lg bg-gray-100 py-3 text-gray-700 transition hover:bg-gray-200">{state === 'failed' ? 'Sepete dön' : 'Alışverişe devam et'}</Link>
        </div>
      </section>
    </main>
  )
}
