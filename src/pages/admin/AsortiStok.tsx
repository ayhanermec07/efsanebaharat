import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { ArrowRightLeft, Boxes, PackageCheck, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Stock = {
  id: string
  urun_id: string
  birim_turu: string
  birim_adedi?: number
  birim_adedi_turu?: string
  stok_miktari?: number
  stok_birimi?: string
  xml_imported?: boolean
  aktif_durum?: boolean
  xml_export?: boolean
}

type Product = { id: string; urun_adi: string; urun_kodu?: string }
type Preparation = {
  id: string
  urun_id: string
  ana_stok_id: string
  asorti_stok_id: string
  paket_adedi: number
  harcanan_gram: number
  olusturma_tarihi: string
}

const gramsFor = (amount: number, unit?: string) => {
  const normalized = String(unit || '').toLowerCase()
  if (normalized === 'kg' || normalized === 'kilogram') return amount * 1000
  return amount
}

const displayUnit = (stock: Pick<Stock, 'birim_adedi' | 'birim_adedi_turu' | 'birim_turu'>) =>
  `${Number(stock.birim_adedi || 0)} ${String(stock.birim_adedi_turu || stock.birim_turu || '').toUpperCase()}`

const isWeightStock = (stock: Pick<Stock, 'stok_birimi'>) => ['gr', 'gram', 'kg', 'kilogram'].includes(String(stock.stok_birimi || '').toLowerCase())

export default function AdminAsortiStok() {
  const [products, setProducts] = useState<Product[]>([])
  const [stocks, setStocks] = useState<Stock[]>([])
  const [history, setHistory] = useState<Preparation[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [sourceStockId, setSourceStockId] = useState('')
  const [assortmentStockId, setAssortmentStockId] = useState('')
  const [packageQuantity, setPackageQuantity] = useState('')

  async function loadData() {
    try {
      setLoading(true)
      const [{ data: productRows, error: productError }, { data: stockRows, error: stockError }, { data: historyRows, error: historyError }] = await Promise.all([
        supabase.from('urunler').select('id, urun_adi, urun_kodu').eq('aktif_durum', true).order('urun_adi'),
        supabase.from('urun_stoklari').select('id, urun_id, birim_turu, birim_adedi, birim_adedi_turu, stok_miktari, stok_birimi, xml_imported, aktif_durum, xml_export').eq('aktif_durum', true),
        supabase.from('asorti_stok_hareketleri').select('id, urun_id, ana_stok_id, asorti_stok_id, paket_adedi, harcanan_gram, olusturma_tarihi').order('olusturma_tarihi', { ascending: false }).limit(12),
      ])
      if (productError || stockError || historyError) throw productError || stockError || historyError
      setProducts(productRows || [])
      setStocks(stockRows || [])
      setHistory(historyRows || [])
    } catch (error: any) {
      console.error('Asorti stoklari yuklenemedi:', error)
      toast.error(error.message || 'Asorti stoklari yuklenemedi')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadData() }, [])

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])
  const sourceStocks = useMemo(() => stocks.filter((stock) => stock.xml_imported === true && isWeightStock(stock)), [stocks])
  const unsupportedImportedStockCount = useMemo(() => stocks.filter((stock) => stock.xml_imported === true && !isWeightStock(stock)).length, [stocks])
  const sourceStock = useMemo(() => stocks.find((stock) => stock.id === sourceStockId) || null, [stocks, sourceStockId])
  const assortments = useMemo(() => sourceStock
    ? stocks.filter((stock) => stock.urun_id === sourceStock.urun_id && stock.xml_imported !== true && stock.id !== sourceStock.id)
    : [], [sourceStock, stocks])
  const assortmentStock = useMemo(() => assortments.find((stock) => stock.id === assortmentStockId) || null, [assortments, assortmentStockId])
  const quantity = Math.max(0, Math.floor(Number(packageQuantity) || 0))
  const neededGrams = assortmentStock ? gramsFor(Number(assortmentStock.birim_adedi || 0), assortmentStock.birim_adedi_turu || assortmentStock.birim_turu) * quantity : 0
  const sourceGrams = sourceStock ? gramsFor(Number(sourceStock.stok_miktari || 0), sourceStock.stok_birimi) : 0
  const canPrepare = Boolean(sourceStock && assortmentStock && quantity > 0 && neededGrams > 0 && sourceGrams >= neededGrams)

  function selectSource(stockId: string) {
    setSourceStockId(stockId)
    setAssortmentStockId('')
  }

  async function prepareStock() {
    if (!sourceStock || !assortmentStock || !canPrepare) {
      toast.error('Ana stok, asorti ve yeterli paket adedi seçin')
      return
    }

    setSaving(true)
    try {
      const { data, error } = await supabase.functions.invoke('asorti-stok-hazirla', {
        body: { sourceStockId: sourceStock.id, assortmentStockId: assortmentStock.id, packageQuantity: quantity },
      })
      if (error || data?.error) throw new Error(data?.error?.message || error?.message || 'Stok hazirlanamadi')
      toast.success(`${quantity} paket ${displayUnit(assortmentStock)} asorti stoğuna eklendi`)
      setPackageQuantity('')
      await loadData()
    } catch (error: any) {
      console.error('Asorti stok hazirlama hatasi:', error)
      toast.error(error.message || 'Stok hazirlanamadi')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="py-16 text-center"><span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" /></div>

  return (
    <main className="mx-auto max-w-6xl space-y-5">
      <section className="rounded-xl border border-orange-100 bg-orange-50 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-orange-800"><Boxes className="h-5 w-5" /><span className="text-sm font-semibold">Depo dönüşümü</span></div>
            <h1 className="mt-2 text-2xl font-bold text-gray-950 sm:text-3xl">Asorti Stok Hazırla</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-700">Panelden gelen ham gram stoğunu, hazırladığınız paket adedi kadar asorti stoğuna aktarın. XML yalnızca paketli asortilerin stoklarını gösterir.</p>
          </div>
          <button type="button" onClick={() => void loadData()} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-orange-100">
            <RefreshCw className="h-4 w-4" /> Yenile
          </button>
        </div>
      </section>

      {!sourceStocks.length ? (
        <section className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600">Gram veya kilogram olarak gelen ham stok bulunamadı. Önce XML Yönetimi alanından ürün stoklarını içe aktarın.</section>
      ) : (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-sm font-semibold text-gray-800">1. Ana stok</span>
              <select value={sourceStockId} onChange={(event) => selectSource(event.target.value)} className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900">
                <option value="">Ham ürün seçin</option>
                {sourceStocks.map((stock) => {
                  const product = productById.get(stock.urun_id)
                  return <option key={stock.id} value={stock.id}>{product?.urun_adi || 'Ürün'} — {Number(stock.stok_miktari || 0)} {String(stock.stok_birimi || 'gr').toUpperCase()}</option>
                })}
              </select>
            </label>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-sm font-semibold text-gray-800">2. Hazırlanan asorti</span>
              <select value={assortmentStockId} disabled={!sourceStock || !assortments.length} onChange={(event) => setAssortmentStockId(event.target.value)} className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-sm text-gray-900 disabled:cursor-not-allowed disabled:bg-gray-100">
                <option value="">Asorti seçin</option>
                {assortments.map((stock) => <option key={stock.id} value={stock.id}>{displayUnit(stock)} — mevcut: {Number(stock.stok_miktari || 0)} paket{stock.xml_export ? ' · XML’de' : ''}</option>)}
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-sm font-semibold text-gray-800">3. Hazırlanan paket adedi</span>
              <input type="number" inputMode="numeric" min="1" step="1" value={packageQuantity} onChange={(event) => setPackageQuantity(event.target.value)} placeholder="Örn. 40" className="min-h-11 w-full rounded-lg border border-gray-300 px-3 text-gray-900" />
            </label>
            <button type="button" disabled={!canPrepare || saving} onClick={() => void prepareStock()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-orange-600 px-5 py-2.5 font-semibold text-white hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50">
              <ArrowRightLeft className="h-5 w-5" /> {saving ? 'Aktarılıyor...' : 'Stoğa aktar'}
            </button>
          </div>

          {sourceStock && assortmentStock && (
            <div className={`mt-5 rounded-lg border p-4 text-sm ${sourceGrams >= neededGrams && quantity > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <p className="font-semibold">Dönüşüm özeti</p>
              <p className="mt-1">{quantity || 0} paket × {displayUnit(assortmentStock)} = <strong>{neededGrams.toLocaleString('tr-TR')} gr</strong> ana stok kullanır.</p>
              <p className="mt-1">Ana stok: {sourceGrams.toLocaleString('tr-TR')} gr → işlem sonrası yaklaşık {Math.max(0, sourceGrams - neededGrams).toLocaleString('tr-TR')} gr kalır.</p>
              {sourceGrams < neededGrams && <p className="mt-2 font-semibold">Ana stok bu paketleme için yeterli değil.</p>}
            </div>
          )}
        </section>
      )}

      {unsupportedImportedStockCount > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">Paket veya adet olarak gelen {unsupportedImportedStockCount} eski aktarım stoğu bu ekranda gösterilmez. Bu dönüşüm yalnızca gram/kilogram ana stoklarla kullanılabilir.</p>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-orange-700" /><h2 className="text-lg font-bold text-gray-950">Son stok hazırlama işlemleri</h2></div>
        {!history.length ? <p className="mt-4 text-sm text-gray-600">Henüz paketleme işlemi yapılmadı.</p> : (
          <div className="mt-4 overflow-x-auto"><table className="min-w-[620px] w-full text-sm"><thead className="border-b text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="pb-3 pr-4">Ürün</th><th className="pb-3 pr-4">Asorti</th><th className="pb-3 pr-4">Paket</th><th className="pb-3 pr-4">Kullanılan ana stok</th><th className="pb-3">Tarih</th></tr></thead><tbody className="divide-y">{history.map((entry) => { const stock = stocks.find((item) => item.id === entry.asorti_stok_id); return <tr key={entry.id}><td className="py-3 pr-4 font-medium text-gray-900">{productById.get(entry.urun_id)?.urun_adi || 'Ürün'}</td><td className="py-3 pr-4">{stock ? displayUnit(stock) : 'Asorti'}</td><td className="py-3 pr-4">{entry.paket_adedi}</td><td className="py-3 pr-4">{Number(entry.harcanan_gram).toLocaleString('tr-TR')} gr</td><td className="py-3 whitespace-nowrap">{new Date(entry.olusturma_tarihi).toLocaleString('tr-TR')}</td></tr> } )}</tbody></table></div>
        )}
      </section>
    </main>
  )
}
