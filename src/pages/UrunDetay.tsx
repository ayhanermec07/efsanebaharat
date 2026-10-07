import { SiteImage } from '../components/SiteImage'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertCircle, Check, Minus, Plus, RotateCcw, ShoppingBag, Sprout } from 'lucide-react'
import UrunSoruModul from '../components/UrunSoruModul'
import { useAuth } from '../contexts/AuthContext'
import { useSepet } from '../contexts/SepetContext'
import { formatPrice } from '../lib/currency'
import { supabase } from '../lib/supabase'
import { akilliBirimGoster } from '../utils/birimDonusturucu'
import { getImageUrl } from '../utils/imageUtils'
import { kademeliIskontoUygula } from '../utils/iskonto'

export default function UrunDetay() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { sepeteEkle } = useSepet()
  const { user, musteriData, grupIskontoOrani, ozelIskontoOrani } = useAuth()
  const [urun, setUrun] = useState<any>(null)
  const [secilenStok, setSecilenStok] = useState<any>(null)
  const [miktar, setMiktar] = useState(1)
  const [secilenGorsel, setSecilenGorsel] = useState(0)
  const [eklendi, setEklendi] = useState(false)
  const [ekleniyor, setEkleniyor] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadState, setLoadState] = useState<'ready' | 'not-found' | 'error'>('ready')
  const requestSequence = useRef(0)

  const iskontoInfo = useMemo(() => {
    if (!secilenStok) return null
    return kademeliIskontoUygula(Number(secilenStok.fiyat || 0), grupIskontoOrani, ozelIskontoOrani)
  }, [grupIskontoOrani, ozelIskontoOrani, secilenStok])

  const loadUrun = useCallback(async () => {
    const requestId = ++requestSequence.current
    setLoading(true)
    setLoadState('ready')
    setUrun(null)
    setSecilenStok(null)
    setSecilenGorsel(0)
    const { data, error } = await supabase
      .from('urunler')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (requestId !== requestSequence.current) return
    if (error) {
      setLoadState('error')
      setLoading(false)
      return
    }
    if (!data) {
      setLoadState('not-found')
      setLoading(false)
      return
    }

    const musteriTipi = musteriData?.musteri_tipi || 'musteri'

    const results = await Promise.all([
      supabase.from('urun_gorselleri').select('*').eq('urun_id', data.id).order('sira_no'),
      supabase.from('urun_stoklari').select('*').eq('urun_id', data.id).eq('aktif_durum', true),
      data.kategori_id ? supabase.from('kategoriler').select('*').eq('id', data.kategori_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      data.marka_id ? supabase.from('markalar').select('*').eq('id', data.marka_id).maybeSingle() : Promise.resolve({ data: null, error: null })
    ])
    if (requestId !== requestSequence.current) return
    const [{ data: gorseller, error: gorsellerError }, { data: stoklar, error: stoklarError }, { data: kategori, error: kategoriError }, { data: marka, error: markaError }] = results
    if (gorsellerError || stoklarError || kategoriError || markaError) {
      setLoadState('error')
      setLoading(false)
      return
    }

    const filtreliStoklar = stoklar?.filter(s =>
      Number.isFinite(Number(s.fiyat)) && Number(s.fiyat)>0 &&
      (!s.stok_grubu || s.stok_grubu === 'hepsi' || s.stok_grubu === musteriTipi)
    ) || []

    setUrun({
      ...data,
      urun_gorselleri: gorseller || [],
      urun_stoklari: filtreliStoklar,
      kategoriler: kategori,
      markalar: marka
    })

    if (filtreliStoklar.length > 0) {
      setSecilenStok(filtreliStoklar[0])
      setMiktar(filtreliStoklar[0].min_siparis_miktari || 1)
    }
    setLoading(false)
  }, [id, musteriData?.musteri_tipi])

  useEffect(() => {
    if (id) {
      loadUrun()
    }
  }, [id, loadUrun])

  function selectStok(stok: any) {
    setSecilenStok(stok)
    setMiktar(Math.max(stok.min_siparis_miktari || 1, miktar))
  }

  async function handleSepeteEkle() {
    if (!user) {
      navigate('/giris')
      return
    }

    if (!urun || !secilenStok || ekleniyor) return

    const gorsel = getImageUrl(urun.urun_gorselleri?.[0]?.gorsel_url)
    const fiyat = iskontoInfo?.varMi ? iskontoInfo.yeniFiyat : Number(secilenStok.fiyat || 0)

    setEkleniyor(true)
    const result = await sepeteEkle({
      stok_varyant_id: secilenStok.id,
      urun_id: urun.id,
      urun_adi: urun.urun_adi,
      birim_turu: secilenStok.birim_turu,
      birim_adedi: secilenStok.birim_adedi,
      birim_adedi_turu: secilenStok.birim_adedi_turu || secilenStok.birim_turu,
      birim_fiyat: fiyat,
      miktar,
      gorsel_url: gorsel,
      min_siparis_miktari: secilenStok.min_siparis_miktari
    })
    setEkleniyor(false)

    // "Sepete eklendi" yalnız sunucu başarı döndürdüğünde gösterilir.
    if (!result.ok) return
    setEklendi(true)
    window.setTimeout(() => setEklendi(false), 2000)
  }

  if (loading) {
    return (
      <div className="shop-container py-16">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
      </div>
    )
  }

  if (loadState === 'not-found') return <div className="shop-container py-16 text-center"><h1 className="text-2xl font-bold text-zinc-950">Ürün bulunamadı</h1><p className="mt-2 text-zinc-600">Ürün kaldırılmış veya bağlantı geçersiz olabilir.</p><button type="button" onClick={() => navigate('/urunler')} className="mt-5 min-h-10 rounded-lg bg-zinc-950 px-4 text-white">Ürünlere dön</button></div>
  if (loadState === 'error') return <div className="shop-container py-16 text-center"><AlertCircle className="mx-auto h-10 w-10 text-red-600" /><h1 className="mt-3 text-2xl font-bold text-zinc-950">Ürün yüklenemedi</h1><p className="mt-2 text-zinc-600">Bağlantıyı kontrol edip tekrar deneyin.</p><button type="button" onClick={loadUrun} className="mx-auto mt-5 flex min-h-10 items-center gap-2 rounded-lg bg-zinc-950 px-4 text-white"><RotateCcw className="h-4 w-4" />Tekrar dene</button></div>

  const gorseller = urun.urun_gorselleri || []
  const fiyat = iskontoInfo?.varMi ? iskontoInfo.yeniFiyat : Number(secilenStok?.fiyat || 0)
  const minimumMiktar = secilenStok?.min_siparis_miktari || 1

  return (
    <div className="shop-container py-6 sm:py-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-10">
        <section className="min-w-0">
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
            <div className="aspect-square bg-zinc-100">
              {gorseller.length > 0 ? (
                <SiteImage
                  variant="detail"
                  loading="eager"
                  fetchPriority="high"
                  sizes="(min-width: 1280px) 736px, (min-width: 1024px) calc(100vw - 544px), calc(100vw - 32px)"
                  src={getImageUrl(gorseller[secilenGorsel]?.gorsel_url)}
                  alt={urun.urun_adi}
                  className="h-full w-full object-contain p-3"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-brand-soft">
                  <div className="flex h-28 w-28 items-center justify-center rounded-full bg-zinc-950 text-5xl font-bold text-white">
                    {urun.urun_adi?.charAt(0) || 'E'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {gorseller.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {gorseller.map((gorsel: any, index: number) => (
                <button
                  key={gorsel.id}
                  type="button"
                  onClick={() => setSecilenGorsel(index)}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 bg-white ${index === secilenGorsel ? 'border-orange-600' : 'border-zinc-200'}`}
                >
                  <SiteImage variant="thumb" src={getImageUrl(gorsel.gorsel_url)} alt={`${urun.urun_adi} ${index + 1}`} className="h-full w-full object-contain p-3" />
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="min-w-0">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
            <div className="shop-eyebrow">
              <Sprout className="h-4 w-4" />
              {urun.markalar?.marka_adi || urun.kategoriler?.kategori_adi || 'Efsane Baharat'}
            </div>
            <h1 className="mt-3 break-words text-3xl font-bold leading-tight text-zinc-950 sm:text-4xl">
              {urun.urun_adi}
            </h1>
            {urun.aciklama && (
              <p className="mt-4 text-sm leading-7 text-zinc-600 sm:text-base">{urun.aciklama}</p>
            )}

            <div className="mt-5 rounded-lg bg-orange-50 p-4">
              {iskontoInfo?.varMi ? (
                <>
                  <div className="text-sm font-bold text-zinc-500 line-through">{formatPrice(iskontoInfo.eskiFiyat)}</div>
                  <div className="mt-1 flex flex-wrap items-end justify-between gap-2">
                    <span className="text-3xl font-bold text-zinc-950">{secilenStok ? formatPrice(fiyat) : 'Satışa hazır seçenek yok'}</span>
                    <span className="rounded-full bg-brand-clay px-3 py-1 text-xs font-bold text-white">%{iskontoInfo.oran} indirim</span>
                  </div>
                </>
              ) : (
                <span className="text-3xl font-bold text-zinc-950">{secilenStok ? formatPrice(fiyat) : 'Satışa hazır seçenek yok'}</span>
              )}
            </div>

            {urun.urun_stoklari && urun.urun_stoklari.length > 0 && (
              <div className="mt-6">
                <h2 className="text-sm font-bold text-zinc-950">Sorti seçimi</h2>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {urun.urun_stoklari.map((stok: any) => {
                    const stokIskontoInfo = kademeliIskontoUygula(Number(stok.fiyat || 0), grupIskontoOrani, ozelIskontoOrani)
                    const stokFiyat = stokIskontoInfo.varMi ? stokIskontoInfo.yeniFiyat : Number(stok.fiyat || 0)

                    return (
                      <button
                        key={stok.id}
                        type="button"
                        onClick={() => selectStok(stok)}
                        className={`min-h-[74px] rounded-lg border p-3 text-left transition ${secilenStok?.id === stok.id
                          ? 'border-emerald-700 bg-emerald-50 shadow-sm'
                          : 'border-zinc-200 bg-white hover:border-orange-300'
                          }`}
                      >
                        <div className="font-bold text-zinc-950">
                          {akilliBirimGoster(stok.birim_adedi || 1, stok.birim_adedi_turu || stok.birim_turu)}
                        </div>
                        <div className="mt-1 text-sm font-bold text-orange-700">{formatPrice(stokFiyat)}</div>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="mt-6">
              <h2 className="text-sm font-bold text-zinc-950">Miktar</h2>
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMiktar(Math.max(minimumMiktar, miktar - 1))}
                  disabled={miktar <= minimumMiktar}
                  className="grid h-11 w-11 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-800 disabled:opacity-40"
                  aria-label="Miktarı azalt"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <input
                  type="number"
                  value={miktar}
                  onChange={(e) => setMiktar(Math.max(minimumMiktar, Number(e.target.value) || minimumMiktar))}
                  min={minimumMiktar}
                  className="shop-input w-24 text-center font-bold"
                />
                <button
                  type="button"
                  onClick={() => setMiktar(miktar + 1)}
                  className="grid h-11 w-11 place-items-center rounded-lg border border-zinc-200 bg-white text-zinc-800"
                  aria-label="Miktarı artır"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <span className="text-xs font-semibold text-zinc-500">Min: {minimumMiktar}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => { void handleSepeteEkle() }}
              disabled={!secilenStok || ekleniyor}
              aria-busy={ekleniyor}
              className={`mt-6 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg px-4 font-bold transition disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 ${eklendi
                ? 'bg-emerald-600 text-white'
                : 'bg-brand text-white hover:bg-emerald-800'
                }`}
            >
              {eklendi ? <Check className="h-5 w-5" /> : <ShoppingBag className="h-5 w-5" />}
              {eklendi ? 'Sepete eklendi' : 'Sepete ekle'}
            </button>

            <div className="mt-6 border-t border-zinc-100 pt-5 text-sm">
              <div className="flex justify-between gap-3 py-2">
                <span className="text-zinc-500">Kategori</span>
                <span className="min-w-0 text-right font-bold text-zinc-900">{urun.kategoriler?.kategori_adi || '-'}</span>
              </div>
              <div className="flex justify-between gap-3 py-2">
                <span className="text-zinc-500">Marka</span>
                <span className="min-w-0 text-right font-bold text-zinc-900">{urun.markalar?.marka_adi || '-'}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      <div className="mt-8">
        <UrunSoruModul urunId={urun.id} urunAdi={urun.urun_adi} />
      </div>
    </div>
  )
}
