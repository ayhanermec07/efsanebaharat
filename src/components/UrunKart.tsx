import { SiteImage } from './SiteImage'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowUpRight, Check, PackageOpen, ShoppingBag } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSepet } from '../contexts/SepetContext'
import { kademeliIskontoUygula } from '../utils/iskonto'
import { getImageUrl } from '../utils/imageUtils'
import { formatPrice } from '../lib/currency'
import VariantSelect from './VariantSelect'
import { selectCurrentVariant } from '../lib/product-variants'
import './urun-kart.css'

interface UrunKartProps {
  urun: any
  imageSizes?: string
  kampanya?: {
    indirim_tipi: 'yuzde' | 'tutar'
    indirim_degeri: number
  } | null
}

export default function UrunKart({ urun, kampanya, imageSizes }: UrunKartProps) {
  const { user, isAdmin, musteriData, grupIskontoOrani, ozelIskontoOrani } = useAuth()
  const { sepeteEkle } = useSepet()
  const navigate = useNavigate()

  const [selection, setSelection] = useState<{ scope: string; id: string } | null>(null)
  const scope = `${urun.id}:${user?.id || 'guest'}:${isAdmin}:${musteriData?.musteri_tipi || ''}`
  const currentScope = useRef(scope)
  currentScope.current = scope
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const addPending = useRef(false)
  const mounted = useRef(true)
  const [eklendi, setEklendi] = useState(false)
  const [ekleniyor, setEkleniyor] = useState(false)
  const [imgError, setImgError] = useState(false)

  const satisaHazirStoklar = useMemo(() => (urun.urun_stoklari || []).filter((s: any) => Number.isFinite(Number(s.fiyat)) && Number(s.fiyat) > 0), [urun])

  const secilenStok = selectCurrentVariant<any>(satisaHazirStoklar, selection?.scope === scope ? selection.id : null)
  const currentStockId = secilenStok?.id

  useEffect(() => {
    setSelection(current => current?.scope === scope && current?.id === currentStockId
      ? current
      : currentStockId ? { scope, id: currentStockId } : null)
  }, [scope, currentStockId])

  useEffect(() => {
    if (successTimer.current) clearTimeout(successTimer.current)
    setEklendi(false)
  }, [scope])

  useEffect(() => {
    setImgError(false)
  }, [urun.id, urun.ana_gorsel_url, urun.urun_gorselleri])

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      if (successTimer.current) clearTimeout(successTimer.current)
    }
  }, [])

  const ilkGorsel = getImageUrl(urun.urun_gorselleri?.[0]?.gorsel_url || urun.ana_gorsel_url)

  const fiyatHesapla = (stok: any) => {
    if (!stok) {
      return { satisFiyati: 0, eskiFiyat: 0, indirimVar: false, indirimOrani: 0 }
    }

    const hamFiyat = Number(stok.fiyat || 0)
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
  }
  const fiyatBilgisi = fiyatHesapla(secilenStok)

  const handleSepeteEkle = async () => {
    if (!user) {
      navigate('/giris')
      return
    }

    if (!secilenStok || addPending.current) return

    addPending.current = true
    if (successTimer.current) clearTimeout(successTimer.current)
    setEklendi(false)

    setEkleniyor(true)
    try {
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
      if (!mounted.current || currentScope.current !== scope) return
      if (!result.ok) return
      setEklendi(true)
      successTimer.current = setTimeout(() => setEklendi(false), 1500)
    } finally {
      addPending.current = false
      if (mounted.current) setEkleniyor(false)
    }
  }

  return (
    <article className="product-card group flex h-full min-w-0 flex-col overflow-hidden">
      <Link to={`/urun/${urun.id}`} className="product-card-photo relative block">
        <div className="aspect-square w-full overflow-hidden">
          {ilkGorsel && !imgError ? (
            <SiteImage
              sizes={imageSizes}
              src={ilkGorsel}
              alt={urun.urun_adi}
              className="h-full w-full object-contain p-3 motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-[1.03] sm:p-5"
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

      </Link>

      <div className="product-card-content flex flex-1 flex-col">
        <div className="min-w-0 flex-1">
          <Link to={`/urun/${urun.id}`} className="block min-w-0">
            <h3 className="product-card-title line-clamp-2">
              {urun.urun_adi}
            </h3>
          </Link>
          <div className="mt-1 min-w-0 truncate text-xs font-medium text-zinc-500">
            {urun.markalar?.marka_adi || urun.kategoriler?.kategori_adi || 'Efsane Baharat'}
          </div>
        </div>

        <VariantSelect
          key={scope}
          options={satisaHazirStoklar.map((stok: any) => ({
            id: stok.id,
            label: `${stok.birim_adedi || 1} ${(stok.birim_adedi_turu || stok.birim_turu || '').toUpperCase()}`,
            price: fiyatHesapla(stok).satisFiyati,
          }))}
          selectedId={secilenStok?.id || ''}
          onChange={id => setSelection({ scope, id })}
          disabled={ekleniyor}
        />

        <div className="product-card-price flex items-end justify-between gap-2">
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
            onClick={() => { void handleSepeteEkle().catch(() => { /* SepetContext hata mesajını gösterir. */ }) }}
            disabled={!secilenStok || ekleniyor}
            aria-busy={ekleniyor}
            className={`product-card-add flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500 ${eklendi
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
