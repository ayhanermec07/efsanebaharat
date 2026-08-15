import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { FileText, PackagePlus, Plus, Search, ShoppingBag, Upload, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

interface Stock { id: string; urun_id: string; birim_turu: string; birim_adedi?: number; birim_adedi_turu?: string; fiyat: number; stok_grubu?: string }
interface Product { id: string; urun_adi: string; urun_kodu?: string; fiyat: number; stoklar: Stock[] }
interface OrderItem { urun_id: string; urun_adi: string; birim_turu: string; birim_adedi?: number; birim_adedi_turu?: string; miktar: number; birim_fiyat: number }

const stockKey = (stock: Pick<Stock, 'birim_turu' | 'birim_adedi' | 'birim_adedi_turu'>) => `${stock.birim_turu}|${stock.birim_adedi || 100}|${stock.birim_adedi_turu || stock.birim_turu}`
const itemKey = (item: Pick<OrderItem, 'urun_id' | 'birim_turu' | 'birim_adedi' | 'birim_adedi_turu'>) => `${item.urun_id}|${stockKey(item)}`

export default function XmlMusteriSiparis() {
  const navigate = useNavigate()
  const { user, musteriData, loading: authLoading } = useAuth()
  const [products, setProducts] = useState<Product[]>([])
  const [items, setItems] = useState<OrderItem[]>([])
  const [productQuery, setProductQuery] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedStockKey, setSelectedStockKey] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState('')
  const [customerFirstName, setCustomerFirstName] = useState('')
  const [customerLastName, setCustomerLastName] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!authLoading && (!user || musteriData?.musteri_tipi !== 'xml_musteri')) { navigate('/giris'); return }
    if (user && musteriData?.musteri_tipi === 'xml_musteri') void loadProducts()
  }, [authLoading, musteriData?.musteri_tipi, navigate, user])

  async function loadProducts() {
    try {
      setLoading(true)
      const [{ data: productRows, error: productError }, { data: stockRows, error: stockError }] = await Promise.all([
        supabase.from('urunler').select('id, urun_adi, urun_kodu, fiyat').eq('aktif_durum', true).eq('aktif', true).order('urun_adi'),
        supabase.from('urun_stoklari').select('id, urun_id, birim_turu, birim_adedi, birim_adedi_turu, fiyat, stok_grubu').eq('aktif_durum', true).eq('aktif', true),
      ])
      if (productError || stockError) throw productError || stockError
      const stocks = (stockRows || []).filter((stock) => !stock.stok_grubu || stock.stok_grubu === 'hepsi' || stock.stok_grubu === 'xml_musteri') as Stock[]
      setProducts((productRows || []).map((product) => ({ ...product, stoklar: stocks.filter((stock) => stock.urun_id === product.id) })).filter((product) => product.stoklar.length > 0))
    } catch (error: any) { console.error(error); toast.error(error.message || 'Ürünler yüklenemedi') } finally { setLoading(false) }
  }

  const matchingProducts = useMemo(() => {
    const query = productQuery.trim().toLocaleLowerCase('tr-TR')
    return query ? products.filter((product) => `${product.urun_adi} ${product.urun_kodu || ''}`.toLocaleLowerCase('tr-TR').includes(query)).slice(0, 8) : []
  }, [productQuery, products])
  const selectedProduct = useMemo(() => products.find((product) => product.id === selectedProductId) || null, [products, selectedProductId])
  const selectedStock = useMemo(() => selectedProduct?.stoklar.find((stock) => stockKey(stock) === selectedStockKey) || null, [selectedProduct, selectedStockKey])
  const total = useMemo(() => items.reduce((sum, item) => sum + item.miktar * item.birim_fiyat, 0), [items])

  function selectProduct(product: Product) { setSelectedProductId(product.id); setSelectedStockKey(stockKey(product.stoklar[0])); setProductQuery(product.urun_adi) }
  function addItem() {
    if (!selectedProduct || !selectedStock) return toast.error('Önce bir ürün ve birim seçin')
    const next: OrderItem = { urun_id: selectedProduct.id, urun_adi: selectedProduct.urun_adi, birim_turu: selectedStock.birim_turu, birim_adedi: selectedStock.birim_adedi, birim_adedi_turu: selectedStock.birim_adedi_turu || selectedStock.birim_turu, miktar: Math.max(1, Math.floor(Number(quantity) || 1)), birim_fiyat: Number(selectedStock.fiyat || selectedProduct.fiyat || 0) }
    if (next.birim_fiyat <= 0) return toast.error('Bu ürün için geçerli fiyat bulunamadı')
    setItems((current) => { const index = current.findIndex((item) => itemKey(item) === itemKey(next)); return index < 0 ? [...current, next] : current.map((item, itemIndex) => itemIndex === index ? { ...item, miktar: item.miktar + next.miktar } : item) })
    setQuantity(1); setProductQuery(''); setSelectedProductId(''); setSelectedStockKey(''); toast.success('Ürün sipariş listesine eklendi')
  }
  function changeQuantity(index: number, value: number) { setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, miktar: Math.max(1, Math.floor(value) || 1) } : item)) }
  function removeReceipt() { setReceiptFile(null); setReceiptPreview('') }
  function handleReceipt(file: File | null) {
    if (!file) return removeReceipt()
    if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) return toast.error('Yalnızca JPG, PNG, WEBP veya PDF yükleyebilirsiniz')
    if (file.size > 8 * 1024 * 1024) return toast.error('Fiş dosyası en fazla 8 MB olabilir')
    setReceiptFile(file)
    if (file.type.startsWith('image/')) { const reader = new FileReader(); reader.onload = () => setReceiptPreview(String(reader.result || '')); reader.readAsDataURL(file) } else setReceiptPreview('')
  }
  async function createOrder() {
    if (!user) return toast.error('Önce giriş yapmanız gerekiyor')
    if (!items.length) return toast.error('En az bir ürün ekleyin')
    if (!customerFirstName.trim() || !customerLastName.trim()) return toast.error('Müşteri adı ve soyadı zorunludur')
    if (!receiptFile) return toast.error('Sipariş fişi ekleyin')
    setSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('xml-musteri-siparis', { body: { action: 'create', items: items.map(({ urun_id, birim_turu, birim_adedi, birim_adedi_turu, miktar }) => ({ urun_id, birim_turu, birim_adedi, birim_adedi_turu, miktar })), customerFirstName: customerFirstName.trim(), customerLastName: customerLastName.trim(), receiptData: await toBase64(receiptFile), receiptName: receiptFile.name } })
      if (error || data?.error) throw new Error(data?.error?.message || error?.message || 'Sipariş gönderilemedi')
      toast.success(`${data.data.siparisNo} numaralı siparişiniz gönderildi`); navigate('/xml-siparislerim')
    } catch (error: any) { console.error(error); toast.error(error.message || 'Sipariş gönderilemedi') } finally { setSubmitting(false) }
  }
  if (authLoading || loading) return <div className="shop-container py-16 text-center"><span className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-violet-700 border-t-transparent" /></div>

  return <main className="shop-container py-6 sm:py-8">
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-semibold text-violet-700">XML müşteri alanı</p><h1 className="mt-1 text-2xl font-bold text-zinc-950 sm:text-3xl">Sipariş oluştur</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Ürünleri ekleyin, müşteri bilgilerini yazın, sipariş fişinizi yükleyin ve gönderin.</p></div><button type="button" onClick={() => navigate('/xml-siparislerim')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"><FileText className="h-4 w-4" /> Sipariş geçmişim</button></div>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <section className="min-w-0 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-zinc-950">Ürün ekle</h2><div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_11rem_7rem_auto] md:items-end"><div className="relative min-w-0"><label className="mb-1.5 block text-sm font-medium text-zinc-700">Ürün ara</label><Search className="pointer-events-none absolute left-3 top-10 h-5 w-5 text-zinc-400" /><input value={productQuery} onChange={(event) => { setProductQuery(event.target.value); setSelectedProductId(''); setSelectedStockKey('') }} placeholder="Ürün adı veya kodu" className="shop-input pl-10" />{productQuery.trim() && !selectedProduct && <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-zinc-200 bg-white p-1 shadow-lg">{matchingProducts.length ? matchingProducts.map((product) => <button key={product.id} type="button" onClick={() => selectProduct(product)} className="block w-full rounded-md px-3 py-3 text-left text-sm hover:bg-violet-50"><span className="block font-semibold text-zinc-900">{product.urun_adi}</span>{product.urun_kodu && <span className="text-xs text-zinc-500">{product.urun_kodu}</span>}</button>) : <p className="px-3 py-3 text-sm text-zinc-500">Ürün bulunamadı.</p>}</div>}</div><div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Birim</label><select value={selectedStockKey} disabled={!selectedProduct} onChange={(event) => setSelectedStockKey(event.target.value)} className="shop-input disabled:cursor-not-allowed disabled:bg-zinc-100"><option value="">Birim seçin</option>{selectedProduct?.stoklar.map((stock) => <option key={stock.id} value={stockKey(stock)}>{stock.birim_adedi ? `${stock.birim_adedi} ${stock.birim_adedi_turu || stock.birim_turu}` : stock.birim_turu}</option>)}</select></div><div><label className="mb-1.5 block text-sm font-medium text-zinc-700">Miktar</label><input type="number" min="1" inputMode="numeric" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value) || 1))} className="shop-input" /></div><button type="button" onClick={addItem} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 font-semibold text-white hover:bg-violet-800"><Plus className="h-4 w-4" /> Ekle</button></div>{selectedStock && <p className="mt-3 text-sm text-zinc-600">Görünen birim fiyat: <strong className="text-zinc-900">{Number(selectedStock.fiyat).toFixed(2)} TL</strong>. Gönderimde güncel fiyat ve stok tekrar kontrol edilir.</p>}
        <div className="mt-6 border-t border-zinc-100 pt-5"><h2 className="text-lg font-bold text-zinc-950">Sipariş listesi</h2>{items.length === 0 ? <div className="mt-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-center text-sm text-zinc-500"><ShoppingBag className="mx-auto mb-3 h-8 w-8" />Henüz ürün eklenmedi.</div> : <div className="mt-3 space-y-3">{items.map((item, index) => <article key={itemKey(item)} className="flex flex-col gap-3 rounded-xl border border-zinc-200 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><h3 className="break-words font-semibold text-zinc-900">{item.urun_adi}</h3><p className="text-sm text-zinc-600">{item.birim_adedi ? `${item.birim_adedi} ${item.birim_adedi_turu || item.birim_turu}` : item.birim_turu} · {item.birim_fiyat.toFixed(2)} TL</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => changeQuantity(index, item.miktar - 1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-lg" aria-label="Miktarı azalt">−</button><input type="number" min="1" value={item.miktar} onChange={(event) => changeQuantity(index, Number(event.target.value))} className="h-10 w-16 rounded-lg border border-zinc-300 text-center" /><button type="button" onClick={() => changeQuantity(index, item.miktar + 1)} className="flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-300 text-lg" aria-label="Miktarı artır">+</button><strong className="ml-1 min-w-24 text-right text-zinc-900">{(item.miktar * item.birim_fiyat).toFixed(2)} TL</strong><button type="button" onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="flex h-10 w-10 items-center justify-center rounded-lg text-red-700 hover:bg-red-50 hover:text-red-700" aria-label="Ürünü kaldır"><X className="h-5 w-5" /></button></div></article>)}</div>}</div></section>
      <aside className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-24"><h2 className="text-lg font-bold text-zinc-950">Müşteri, fiş ve gönderim</h2><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1"><label><span className="mb-1.5 block text-sm font-medium text-zinc-700">Müşteri adı</span><input value={customerFirstName} onChange={(event) => setCustomerFirstName(event.target.value)} maxLength={80} autoComplete="given-name" className="shop-input" placeholder="Örn. Ayşe" /></label><label><span className="mb-1.5 block text-sm font-medium text-zinc-700">Müşteri soyadı</span><input value={customerLastName} onChange={(event) => setCustomerLastName(event.target.value)} maxLength={80} autoComplete="family-name" className="shop-input" placeholder="Örn. Yılmaz" /></label></div><p className="mt-4 text-sm text-zinc-600">Sipariş fişi zorunludur. JPG, PNG, WEBP veya PDF; en fazla 8 MB.</p><label className="mt-4 flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-violet-300 bg-violet-50 p-4 text-center text-violet-800 hover:bg-violet-100"><Upload className="h-6 w-6" /><span className="text-sm font-semibold">Fiş seçmek için dokunun</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="hidden" onChange={(event) => handleReceipt(event.target.files?.[0] || null)} /></label>{receiptFile && <div className="mt-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3"><div className="flex items-center gap-2"><FileText className="h-5 w-5 shrink-0 text-violet-700" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-zinc-900">{receiptFile.name}</p><p className="text-xs text-zinc-500">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</p></div><button type="button" onClick={removeReceipt} className="flex h-9 w-9 items-center justify-center rounded-lg text-zinc-600 hover:bg-red-50 hover:text-red-700" aria-label="Fişi kaldır"><X className="h-5 w-5" /></button></div>{receiptPreview && <img src={receiptPreview} alt="Fiş önizlemesi" className="mt-3 max-h-56 w-full rounded-lg object-contain" />}</div>}<div className="mt-5 rounded-xl bg-zinc-50 p-4"><span className="text-sm text-zinc-600">Tahmini toplam</span><p className="mt-1 text-2xl font-bold text-zinc-950">{total.toFixed(2)} TL</p><p className="mt-1 text-xs leading-5 text-zinc-500">Kesin tutar, gönderim sırasında geçerli fiyatlar üzerinden hesaplanır.</p></div><button type="button" disabled={submitting || !items.length || !receiptFile || !customerFirstName.trim() || !customerLastName.trim()} onClick={createOrder} className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-800 px-4 py-3 font-semibold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"><PackagePlus className="h-5 w-5" />{submitting ? 'Gönderiliyor...' : 'Siparişi gönder'}</button></aside>
    </div>
  </main>
}

async function toBase64(file: File) { return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || '')); reader.onerror = () => reject(new Error('Fiş dosyası okunamadı')); reader.readAsDataURL(file) }) }
