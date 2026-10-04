import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Check, PackageOpen, ShoppingBag } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSepet } from '../contexts/SepetContext'
import { kademeliIskontoUygula } from '../utils/iskonto'
import { getImageUrl } from '../utils/imageUtils'
import { formatPrice } from '../lib/currency'

interface UrunKartProps {
  urun: any
  kampanya?: {
    indirim_tipi: 'yuzde' | 'tutar'
    indirim_degeri: number
  } | null
}

export default function UrunKart({ urun, kampanya }: UrunKartProps) {
  const { user, grupIskontoOrani, ozelIskontoOrani } = useAuth()
  const { sepeteEkle } = useSepet()
  const navigate = useNavigate()

  const [secilenStok, setSecilenStok] = useState<any>(null)
  const [eklendi, setEklendi] = useState(false)
  const [ekleniyor, setEkleniyor] = useState(false)
  const [imgError, setImgError] = useState(false)

  const satisaHazirStoklar = useMemo(() => (urun.urun_stoklari || []).filter((s: any) => Number.isFinite(Number(s.fiyat)) && Number(s.fiyat) > 0), [urun])

  useEffect(() => {
    if (satisaHazirStoklar.length > 0) {
      setSecilenStok(satisaHazirStoklar[0])
    } else {
      setSecilenStok(null)
    }
    setImgError(false)
  }, [urun, satisaHazirStoklar])

  const ilkGorsel = getImageUrl(urun.urun_gorselleri?.[0]?.gorsel_url || urun.ana_gorsel_url)

  const fiyatBilgisi = useMemo(() => {
    if (!secilenStok) {
      return { satisFiyati: 0, eskiFiyat: 0, indirimVar: false, indirimOrani: 0 }
    }

    const hamFiyat = Number(secilenStok.fiyat || 0)
    const iskontoInfo = user
      ? kademeliIskontoUygula(hamFiyat, grupIskontoOrani, ozelIskontoOrani)
      : null

    if (kampanya) {
      const satisFiyati = kampanya.indirim_tipi === 'yuzde'
        ? hamFiyat * (1 - kampanya.indirim_degeri / 100)
        : Math.max(0, hamFiyat - kampanya.indirim_degeri)

      return {
        satisFiyati,
        eskiFiyat: hamFiyat,
        indirimVar: true,
        indirimOrani: kampanya.indirim_tipi === 'yuzde'
          ? kampanya.indirim_degeri
          : Math.round(((hamFiyat - satisFiyati) / Math.max(hamFiyat, 1)) * 100)
      }
    }

    if (iskontoInfo?.varMi) {
      return {
        satisFiyati: iskontoInfo.yeniFiyat,
        eskiFiyat: iskontoInfo.eskiFiyat,
        indirimVar: true,
        indirimOrani: iskontoInfo.oran
      }
    }

    return { satisFiyati: hamFiyat, eskiFiyat: hamFiyat, indirimVar: false, indirimOrani: 0 }
  }, [grupIskontoOrani, kampanya, ozelIskontoOrani, secilenStok, user])

  const handleSepeteEkle = async () => {
    if (!user) {
      navigate('/giris')
      return
    }

    if (!secilenStok || ekleniyor) return

    setEkleniyor(true)
    const result = await sepeteEkle({
      stok_varyant_id: secilenStok.id,
      urun_id: urun.id,
      urun_adi: urun.urun_adi,
      birim_turu: secilenStok.birim_turu,
      birim_adedi: secilenStok.birim_adedi,
      birim_adedi_turu: secilenStok.birim_adedi_turu || secilenStok.birim_turu,
      birim_fiyat: fiyatBilgisi.satisFiyati,
      miktar: secilenStok.min_siparis_miktari || 1,
      gorsel_url: ilkGorsel,
      min_siparis_miktari: secilenStok.min_siparis_miktari
    })
    setEkleniyor(false)

    // "Eklendi" yalnız sunucu başarı döndürdüğünde gösterilir; hata mesajı SepetContext'ten gelir.
    if (!result.ok) return
    setEklendi(true)
    window.setTimeout(() => setEklendi(false), 2000)
  }

  return (
    <article className="group flex h-full min-w-0 flex-col overflow-hidden rounded-lg border border-brand-line bg-brand-paper transition hover:border-emerald-300 hover:shadow-md">
      <Link to={`/urun/${urun.id}`} className="relative block bg-brand-soft">
        <div className="aspect-square w-full overflow-hidden">
          {ilkGorsel && !imgError ? (
            <img
              src={ilkGorsel}
              alt={urun.urun_adi}
              className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.03] sm:p-5"
              loading="lazy"
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="shop-image-placeholder">
              <PackageOpen className="h-10 w-10 opacity-60" aria-hidden="true" />
              <span className="text-center text-xs text-brand-muted">Görsel hazırlanıyor</span>
            </div>
          )}
        </div>

        {fiyatBilgisi.indirimVar && (
          <span className="site-secondary-bg absolute left-2 top-2 rounded-md px-2.5 py-1 text-xs font-semibold text-white">
            %{Math.max(0, Math.round(fiyatBilgisi.indirimOrani))} indirim
          </span>
        )}

        {satisaHazirStoklar.length > 1 && (
          <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-zinc-700 shadow-sm">
            {satisaHazirStoklar.length} sorti
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-3 sm:p-4">
        <div className="min-w-0 flex-1">
          <Link to={`/urun/${urun.id}`} className="block min-w-0">
            <h3 className="line-clamp-2 min-h-[2.75rem] text-base leading-snug text-brand-ink transition group-hover:text-emerald-700 sm:text-lg">
              {urun.urun_adi}
            </h3>
          </Link>
          <div className="mt-1 min-w-0 truncate text-xs font-medium text-zinc-500">
            {urun.markalar?.marka_adi || urun.kategoriler?.kategori_adi || 'Efsane Baharat'}
          </div>
        </div>

        {urun.urun_stoklari && satisaHazirStoklar.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {satisaHazirStoklar.map((stok: any) => (
              <button
                key={stok.id}
                type="button"
                onClick={() => setSecilenStok(stok)}
                aria-pressed={secilenStok?.id === stok.id}
                className={`min-h-11 min-w-0 rounded-lg border px-2 py-1.5 text-xs font-medium transition ${secilenStok?.id === stok.id
                  ? 'border-emerald-700 bg-emerald-700 text-white'
                  : 'border-brand-line bg-brand-paper text-brand-muted hover:border-emerald-300'
                  }`}
              >
                {stok.birim_adedi || 1} {(stok.birim_adedi_turu || stok.birim_turu || '').toUpperCase()}
              </button>
            ))}
          </div>
        )}

        <div className="flex min-h-[44px] items-end justify-between gap-2">
          <div className="min-w-0">
            {secilenStok ? (
              <>
                <div className="break-words text-lg font-semibold leading-tight tabular-nums text-brand-ink sm:text-xl">
                  {formatPrice(fiyatBilgisi.satisFiyati)}
                </div>
                {fiyatBilgisi.indirimVar && (
                  <div className="mt-1 text-xs font-semibold text-zinc-400 line-through">
                    {formatPrice(fiyatBilgisi.eskiFiyat)}
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm font-semibold text-zinc-500">Stok seçiniz</div>
            )}
          </div>
        </div>

        {user ? (
          <button
            type="button"
            onClick={() => { void handleSepeteEkle() }}
            disabled={!secilenStok || ekleniyor}
            aria-busy={ekleniyor}
            className={`flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 ${eklendi
              ? 'bg-emerald-600 text-white'
              : 'site-primary-bg site-primary-hover text-white'
              }`}
          >
            {eklendi ? <Check className="h-4 w-4" aria-hidden="true" /> : <ShoppingBag className="h-4 w-4" aria-hidden="true" />}
            <span>{eklendi ? 'Eklendi' : 'Sepete ekle'}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => navigate(`/urun/${urun.id}`)}
            className="shop-btn-secondary w-full gap-1.5 px-2 text-xs sm:text-sm"
          >
            <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Ürünü incele</span>
          </button>
        )}
      </div>
    </article>
  )
}
