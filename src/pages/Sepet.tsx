import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { AlertCircle, CreditCard, LockKeyhole, Minus, Plus, RotateCcw, ShoppingBag, Trash2 } from 'lucide-react'
import { availablePaymentMethods, checkoutStorageKey, PAYMENT_METHOD_LABELS, type PaymentMethod, type PaymentSettings } from '../lib/payment-methods'
import BankTransferDetails from '../components/BankTransferDetails'
import SellerInformation from '../components/SellerInformation'
import { usesConsumerCheckout } from '../lib/business-info'
import KampanyaUygula from '../components/KampanyaUygula'
import { useAuth } from '../contexts/AuthContext'
import { useSepet } from '../contexts/SepetContext'
import { CHECKOUT_TERMINAL_CODES, cartVersion, nextCheckoutAttempt, type CheckoutAttempt } from '../lib/cart-commands'
import { formatPrice } from '../lib/currency'
import { supabase } from '../lib/supabase'
import { akilliBirimGoster } from '../utils/birimDonusturucu'
import CheckoutReviewPanel from '../components/CheckoutReview'
import type { CheckoutReview } from '../lib/commerce'

const IN_PROGRESS_RETRIES = 5

type PaymentResponse = {
  review_id?: string
  expires_at?: string
  snapshot?: CheckoutReview['snapshot']
  action?: string
  token?: string
  siparis_id?: string
  error?: { code?: string; message?: string; retryable?: boolean; siparis_id?: string }
}

function readStoredAttempt(method: PaymentMethod): CheckoutAttempt | null {
  try {
    const parsed = JSON.parse(window.sessionStorage.getItem(checkoutStorageKey(method)) || 'null')
    return parsed && typeof parsed.key === 'string' ? parsed : null
  } catch {
    return null
  }
}

function storeAttempt(attempt: CheckoutAttempt | null, method: PaymentMethod) {
  try {
    if (attempt) window.sessionStorage.setItem(checkoutStorageKey(method), JSON.stringify(attempt))
    else window.sessionStorage.removeItem(checkoutStorageKey(method))
  } catch {
    // Depolama kapalıysa anahtar yalnız bellekte tutulur.
  }
}

async function invokePayment(attempt: CheckoutAttempt, paymentMethod: PaymentMethod, review?: CheckoutReview, preview=false): Promise<PaymentResponse> {
  const { data, error } = await supabase.functions.invoke('paytr-payment', {
    body: { paymentMethod, idempotencyKey: attempt.key, cartVersion: attempt.cartVersion, kampanyaKodu: attempt.kampanyaKodu || null, ...(preview?{phase:'preview'}:{reviewId:review?.review_id,reviewAccepted:Boolean(review)}) },
  })
  if (!error) return (data || {}) as PaymentResponse
  const context = (error as { context?: Response }).context
  if (context && typeof context.json === 'function') {
    try {
      return (await context.json()) as PaymentResponse
    } catch {
      // Gövde okunamadıysa ağ hatası gibi ele alınır.
    }
  }
  return { error: { code: 'NETWORK_ERROR', message: 'Bağlantı hatası: ödeme başlatılamadı, tekrar deneyin', retryable: true } }
}

function QuantityInput({ value, min, disabled, onCommit }: { value: number; min: number; disabled: boolean; onCommit: (next: number) => Promise<{ ok: boolean }> }) {
  const [draft, setDraft] = useState(String(value))
  const latestValue = useRef(value)
  useEffect(() => {
    latestValue.current = value
    setDraft(String(value))
  }, [value])
  const commit = async () => {
    const next = Number(draft.replace(',', '.'))
    if (draft.trim() === '' || Number.isNaN(next) || next === value) {
      setDraft(String(value))
      return
    }
    const result = await onCommit(next)
    // Başarısız komutta taslak, sunucudan gelen son miktara döner.
    if (!result.ok) setDraft(String(latestValue.current))
  }
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      value={draft}
      disabled={disabled}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { void commit() }}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
      onFocus={(e) => e.target.select()}
      aria-label="Miktar"
      className="shop-input w-20 text-center font-bold disabled:opacity-60"
    />
  )
}

export default function Sepet() {
  const { sepetItems, sepettenCikar, miktarGuncelle, toplamTutar, sepetiTemizle, sepetiYenile, sepetHatasi, bekleyenStoklar } = useSepet()
  const { user, musteriData } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPaymentIframe, setShowPaymentIframe] = useState(false)
  const [paymentToken, setPaymentToken] = useState('')
  const [uygulananKampanya, setUygulananKampanya] = useState<any>(null)
  const [kampanyaIndirimi, setKampanyaIndirimi] = useState(0)
  const checkoutAttempt = useRef<CheckoutAttempt | null>(null)
  const [review,setReview]=useState<CheckoutReview|null>(null)
  const [reviewAccepted,setReviewAccepted]=useState(false)

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('havale')
  const recoveredAttempts = useRef(new Set<string>())
  useEffect(() => {
    if (!user) return
    const attempt = readStoredAttempt(paymentMethod)
    if (!attempt || recoveredAttempts.current.has(attempt.key)) return
    recoveredAttempts.current.add(attempt.key)
    // A committed order can clear the cart before its HTTP response arrives.
    // Replay the stored key on reload; the server rejects any new unreviewed order.
    void invokePayment(attempt, paymentMethod).then(response => {
      if (response.action === 'order_created' && response.siparis_id) {
        storeAttempt(null, paymentMethod)
        navigate(`/odeme-basarili?order_id=${encodeURIComponent(response.siparis_id)}`)
      }
    })
  }, [user, paymentMethod, navigate])
  useEffect(()=>{setReview(null);setReviewAccepted(false)},[sepetItems,paymentMethod,uygulananKampanya])
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null)
  const [settingsError, setSettingsError] = useState(false)
  useEffect(() => {
    let active = true
    void supabase.from('checkout_payment_settings').select('*').single().then(({ data, error }) => {
      if (!active) return
      setSettingsError(Boolean(error))
      if (data) { setPaymentSettings(data); setPaymentMethod(availablePaymentMethods(data)[0] || 'havale') }
    })
    return () => { active = false }
  }, [])
  const methods = paymentSettings ? availablePaymentMethods(paymentSettings) : []
  const indirimliToplam = Math.max(0, toplamTutar - kampanyaIndirimi)
  const sepetMesgul = bekleyenStoklar.size > 0

  async function handleOdemeYap() {
    if (!user || !musteriData) {
      toast.error('Ödeme yapmak için giriş yapmalısınız')
      navigate('/giris?redirect=/sepet')
      return
    }

    if (musteriData.aktif_durum === false) {
      toast.error('Hesabınız yönetici onayı bekliyor')
      return
    }

    if (sepetItems.length === 0) {
      toast.error('Sepetiniz boş')
      return
    }

    if (sepetMesgul) {
      toast.error('Sepet güncelleniyor, lütfen bekleyin')
      return
    }

    if (!methods.includes(paymentMethod)) { toast.error('Ödeme yöntemi şu anda kullanılamıyor'); return }
    setLoading(true)
    try {
      // Aynı sepet sürümü + kampanya için anahtar bir kez üretilir ve her
      // yeniden denemede (cevap kaybı, iframe kapatma) aynı anahtar gönderilir.
      const version = await cartVersion(sepetItems)
      const attempt = nextCheckoutAttempt(
        checkoutAttempt.current || readStoredAttempt(paymentMethod),
        version,
        String(uygulananKampanya?.kod || ''),
        () => crypto.randomUUID(),
      )
      checkoutAttempt.current = attempt
      storeAttempt(attempt, paymentMethod)

      if (!review) {
        const response=await invokePayment(attempt,paymentMethod,undefined,true)
        if(response.review_id&&response.expires_at&&response.snapshot){setReview({review_id:response.review_id,expires_at:response.expires_at,snapshot:response.snapshot});setReviewAccepted(false);return}
        toast.error(response.error?.message||'Sipariş bilgileri alınamadı. Lütfen tekrar deneyin.');return
      }
      if(!reviewAccepted){toast.error('Sipariş bilgilerini okuyup teyit edin.');return}
      let response = await invokePayment(attempt, paymentMethod,review)
      for (let retry = 0; retry < IN_PROGRESS_RETRIES && response.error?.code === 'CHECKOUT_IN_PROGRESS'; retry++) {
        await new Promise((resolve) => window.setTimeout(resolve, 1500))
        response = await invokePayment(attempt, paymentMethod,review)
      }

      if (response.action === 'order_created' && response.siparis_id) {
        checkoutAttempt.current = null
        storeAttempt(null, paymentMethod)
        await sepetiYenile()
        navigate(`/odeme-basarili?order_id=${encodeURIComponent(response.siparis_id)}`)
        return
      }
      if (response.token) {
        setPaymentToken(response.token)
        setShowPaymentIframe(true)
        return
      }

      const code = response.error?.code || ''
      if(['CHECKOUT_REVIEW_CHANGED','CHECKOUT_REVIEW_EXPIRED','CHECKOUT_REVIEW_REQUIRED'].includes(code)){setReview(null);setReviewAccepted(false)}
      if (CHECKOUT_TERMINAL_CODES.has(code)) {
        checkoutAttempt.current = null
        storeAttempt(null, paymentMethod)
      }
      if (code === 'CART_VERSION_MISMATCH') await sepetiYenile()
      if (code === 'DELIVERY_CONTACT_REQUIRED') {
        toast.error('Ödemeden önce hesabınızda teslimat adresi ve telefon numarası girin.')
        navigate('/hesabim')
        return
      }
      if (code === 'ORDER_ALREADY_FINALIZED' && response.error?.siparis_id) {
        navigate(`/odeme-basarili?order_id=${encodeURIComponent(response.error.siparis_id)}`)
        return
      }
      toast.error(code === 'CHECKOUT_IN_PROGRESS'
        ? 'Ödeme oturumu hâlâ hazırlanıyor. Birkaç saniye sonra tekrar deneyin.'
        : response.error?.message || 'Ödeme başlatılamadı')
    } catch (error: any) {
      console.error('Ödeme başlatma hatası:', error)
      toast.error('Ödeme başlatılamadı, tekrar deneyin')
    } finally {
      setLoading(false)
    }
  }

  if (showPaymentIframe && paymentToken) {
    return (
      <div className="shop-container py-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-zinc-950">Güvenli ödeme</h1>
                <p className="mt-1 text-sm text-zinc-600">PayTR ödeme ekranı aşağıda açıldı.</p>
                <p className="mt-1 text-xs text-zinc-600">Bu ekranı kapatmak ödeme girişimini iptal etmez; kesin sonuç ödeme sağlayıcısının bildirimiyle belirlenir.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowPaymentIframe(false)
                  setPaymentToken('')
                }}
                className="shop-btn-secondary"
              >
                Ödeme ekranını kapat
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <iframe
              src={`https://www.paytr.com/odeme/guvenli/${paymentToken}`}
              id="paytriframe"
              title="PayTR Ödeme"
              frameBorder="0"
              scrolling="auto"
              className="h-[720px] w-full sm:h-[800px]"
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="shop-container py-6 sm:py-8">
      <div className="shop-page-heading mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="shop-eyebrow">
              <ShoppingBag className="h-4 w-4" />
              Sepet
            </div>
            <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Sepetim</h1>
            <p className="mt-2 text-sm leading-6 text-brand-muted sm:text-base">
              Seçili sortileri kontrol edin, kampanyayı uygulayın ve ödemeye geçin.
            </p>
          </div>
          {sepetItems.length > 0 && (
            <button type="button" onClick={() => { if (window.confirm('Sepetinizdeki tüm ürünler kaldırılsın mı?')) void sepetiTemizle() }} disabled={sepetMesgul} className="shop-btn-secondary disabled:cursor-not-allowed disabled:opacity-60">
              <Trash2 className="h-4 w-4" />
              Sepeti temizle
            </button>
          )}
        </div>
      </div>

      {sepetHatasi && (
        <div role="alert" className="mb-4 flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="break-words">{sepetHatasi}</span>
          </div>
          <button type="button" onClick={() => { void sepetiYenile() }} className="flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 font-bold text-red-700">
            <RotateCcw className="h-4 w-4" />
            Tekrar dene
          </button>
        </div>
      )}

      {sepetItems.length === 0 ? (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center shadow-sm">
          <ShoppingBag className="h-16 w-16 text-brand-muted" />
          <h2 className="mt-4 text-2xl font-bold text-zinc-950">Sepetiniz boş</h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-zinc-500">
            Ürünleri inceleyip size uygun sortiyi seçtiğinizde sepet burada hazır olacak.
          </p>
          <Link to="/urunler" className="shop-btn-primary mt-6">
            Alışverişe başla
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="min-w-0 space-y-3">
            {sepetItems.map((item) => {
              const minMiktar = item.min_siparis_miktari || 1
              const stokId = item.stok_varyant_id
              const bekliyor = bekleyenStoklar.has(stokId) || bekleyenStoklar.has('*')

              return (
                <article key={stokId} aria-busy={bekliyor} className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
                    <div className="h-24 w-24 overflow-hidden rounded-lg bg-zinc-100">
                      {item.gorsel_url ? (
                        <img src={item.gorsel_url} alt={item.urun_adi} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-orange-100 text-2xl font-bold text-orange-700">
                          {item.urun_adi.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h2 className="break-words text-base font-bold text-zinc-950 sm:text-lg">{item.urun_adi}</h2>
                          <p className="mt-1 text-sm font-semibold text-zinc-500">
                            {akilliBirimGoster(item.birim_adedi || 1, item.birim_adedi_turu || item.birim_turu)}
                          </p>
                        </div>
                        <div className="text-left sm:text-right">
                          <p className="text-sm font-semibold text-zinc-500">Birim</p>
                          <p className="font-bold text-orange-700">{formatPrice(item.birim_fiyat)}</p>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => { void miktarGuncelle(stokId, Math.max(minMiktar, item.miktar - 1)) }}
                            disabled={bekliyor || item.miktar <= minMiktar}
                            className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-800 disabled:opacity-40"
                            aria-label="Miktarı azalt"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <QuantityInput
                            value={item.miktar}
                            min={minMiktar}
                            disabled={bekliyor}
                            onCommit={(next) => miktarGuncelle(stokId, next)}
                          />
                          <button
                            type="button"
                            onClick={() => { void miktarGuncelle(stokId, item.miktar + 1) }}
                            disabled={bekliyor}
                            className="grid h-10 w-10 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-800 disabled:opacity-40"
                            aria-label="Miktarı artır"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between gap-4 sm:justify-end">
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.12em] text-zinc-400">Toplam</p>
                            <p className="text-lg font-bold text-zinc-950">{formatPrice(item.birim_fiyat * item.miktar)}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => { void sepettenCikar(stokId) }}
                            disabled={bekliyor}
                            className="grid h-10 w-10 place-items-center rounded-lg border border-red-100 bg-red-50 text-red-600 transition hover:bg-red-100 disabled:opacity-40"
                            aria-label="Sepetten çıkar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              )
            })}
          </section>

          <aside className="min-w-0">
            <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm lg:sticky lg:top-24">
              <div className="mb-5 flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-orange-700" />
                <h2 className="text-xl font-bold text-zinc-950">Sipariş özeti</h2>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-3 text-zinc-600">
                  <span>Ürünler toplamı</span>
                  <span className="font-bold text-zinc-900">{formatPrice(toplamTutar)}</span>
                </div>
                {kampanyaIndirimi > 0 && (
                  <div className="flex justify-between gap-3 font-bold text-emerald-700">
                    <span>Kampanya indirimi</span>
                    <span>-{formatPrice(kampanyaIndirimi)}</span>
                  </div>
                )}
                <div className="border-t border-zinc-100 pt-4">
                  <div className="flex items-end justify-between gap-3">
                    <span className="text-base font-bold text-zinc-950">Toplam</span>
                    <span className="text-2xl font-bold text-zinc-950">{formatPrice(indirimliToplam)}</span>
                  </div>
                </div>
              </div>

              <div className="my-5">
                <KampanyaUygula
                  sepetTutari={toplamTutar}
                  onKampanyaUygula={(kampanya, indirim) => {
                    setUygulananKampanya(kampanya)
                    setKampanyaIndirimi(indirim)
                  }}
                />
              </div>

              <fieldset className="mb-4 min-w-0 space-y-3">
                <legend className="mb-2 font-bold">Ödeme yöntemi</legend>
                {methods.map(method => <label key={method} className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm">
                  <input type="radio" name="paymentMethod" value={method} checked={paymentMethod === method} disabled={loading} onChange={() => { setPaymentMethod(method); checkoutAttempt.current = null }} />
                  {PAYMENT_METHOD_LABELS[method]}
                </label>)}
                {!methods.length && <p role="status" className="text-sm text-amber-800">{settingsError ? 'Ödeme bilgileri alınamadı. Sayfayı yenileyin.' : paymentSettings ? 'Şu anda açık bir ödeme yöntemi bulunmuyor.' : 'Ödeme bilgileri yükleniyor…'}</p>}
                {paymentMethod === 'havale' && methods.includes('havale') && paymentSettings && <BankTransferDetails details={paymentSettings} />}
              </fieldset>
              {usesConsumerCheckout(musteriData?.musteri_tipi) && <section data-testid="consumer-checkout-information" className="mb-4 min-w-0 space-y-3 rounded-lg border border-zinc-200 p-3 text-sm">
                <h3 className="font-bold">Satıcı ve tüketici bilgileri</h3>
                <SellerInformation />
                <div className="flex flex-col gap-1">
                  <Link to="/on-bilgilendirme" className="inline-flex min-h-11 items-center underline">Ön Bilgilendirme Formu</Link>
                  <Link to="/mesafeli-satis-sozlesmesi" className="inline-flex min-h-11 items-center underline">Mesafeli Satış Sözleşmesi</Link>
                  <Link to="/iade-iptal-cayma" className="inline-flex min-h-11 items-center underline">İade / İptal / Cayma Hakkı</Link>
                </div>
                <p className="break-words text-sm">Siparişe özel yürürlükteki koşullar son inceleme adımında gösterilir.</p>
              </section>}
              {review&&<CheckoutReviewPanel review={review} accepted={reviewAccepted} onAccept={setReviewAccepted}/>}
              {user ? (
                <button
                  type="button"
                  onClick={handleOdemeYap}
                  disabled={loading || sepetMesgul || !methods.includes(paymentMethod) || Boolean(review&&!reviewAccepted)}
                  className="shop-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Isleniyor...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      {!review?'Sipariş bilgilerini incele':paymentMethod === 'havale' ? 'Havale ile sipariş oluştur' : 'Ödemeye geç'}
                    </>
                  )}
                </button>
              ) : (
                <Link to="/giris?redirect=/sepet" className="shop-btn-primary w-full">
                  Giriş yapın
                </Link>
              )}

              <p className="mt-3 text-center text-xs leading-5 text-zinc-500">
                {paymentMethod === 'havale' ? 'Sipariş oluşturunca tutar ve transfer açıklaması gösterilir. Ödemeniz onaylanana kadar sipariş havale bekler.' : 'Ödeme PayTR üzerinden güvenli sayfada tamamlanır.'}
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
