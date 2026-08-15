import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { Upload, FileText, X, Plus, ShoppingBag } from 'lucide-react'

interface XmlOrderItem {
  urun_id: string
  urun_adi: string
  birim_turu: string
  miktar: number
  birim_fiyat: number
  toplam_fiyat: number
  birim_adedi?: number
  birim_adedi_turu?: string
}

export default function XmlMusteriSiparis() {
  const navigate = useNavigate()
  const { user, musteriData, loading: authLoading } = useAuth()
  const [items, setItems] = useState<XmlOrderItem[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedUnit, setSelectedUnit] = useState('kg')
  const [quantity, setQuantity] = useState(1)
  const [customerName, setCustomerName] = useState('')
  const [receiptFile, setReceiptFile] = useState<File | null>(null)
  const [receiptPreview, setReceiptPreview] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && (!user || musteriData?.musteri_tipi !== 'xml_musteri')) {
      navigate('/giris')
      return
    }

    if (user && musteriData?.musteri_tipi === 'xml_musteri') {
      loadProducts()
    }
  }, [user, authLoading, musteriData, navigate])

  async function loadProducts() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('urunler')
        .select('id, urun_adi, urun_kodu, urun_gorselleri, fiyat')
        .eq('aktif_durum', true)
        .order('urun_adi', { ascending: true })

      if (error) throw error

      const withStocks = await Promise.all(
        (data || []).map(async (urun) => {
          const { data: stoklar } = await supabase
            .from('urun_stoklari')
            .select('*')
            .eq('urun_id', urun.id)
            .eq('aktif_durum', true)
            .order('birim_adedi', { ascending: true })

          return { ...urun, stoklar: stoklar || [] }
        })
      )

      setProducts(withStocks)
    } catch (error: any) {
      console.error('Ürünler yüklenemedi:', error)
      toast.error(error.message || 'Ürünler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId) || null,
    [products, selectedProductId]
  )

  useEffect(() => {
    if (selectedProduct && selectedProduct.stoklar?.length) {
      const preferred = selectedProduct.stoklar.find((s: any) => s.birim_turu === selectedUnit) || selectedProduct.stoklar[0]
      setSelectedUnit(preferred?.birim_turu || 'kg')
    }
  }, [selectedProduct, selectedUnit])

  function addItemFromSelection() {
    if (!selectedProductId) {
      toast.error('Önce ürün seçin')
      return
    }

    const product = products.find((p) => p.id === selectedProductId)
    if (!product) return

    const stockMatch = product.stoklar?.find((stock: any) => stock.birim_turu === selectedUnit) || product.stoklar?.[0]
    const birimFiyat = Number(stockMatch?.fiyat || product.fiyat || 0)

    if (!birimFiyat) {
      toast.error('Bu ürün için fiyat bulunamadı')
      return
    }

    const itemAlreadyExists = items.find(
      (item) => item.urun_id === product.id && item.birim_turu === selectedUnit
    )

    if (itemAlreadyExists) {
      const updated = items.map((item) => {
        if (item.urun_id === product.id && item.birim_turu === selectedUnit) {
          return {
            ...item,
            miktar: item.miktar + quantity,
            toplam_fiyat: Number(((item.miktar + quantity) * birimFiyat).toFixed(2))
          }
        }
        return item
      })
      setItems(updated)
    } else {
      const orderItem: XmlOrderItem = {
        urun_id: product.id,
        urun_adi: product.urun_adi,
        birim_turu: selectedUnit,
        miktar: quantity,
        birim_fiyat: Number(birimFiyat.toFixed(2)),
        toplam_fiyat: Number((quantity * birimFiyat).toFixed(2)),
        birim_adedi: stockMatch?.birim_adedi,
        birim_adedi_turu: stockMatch?.birim_adedi_turu || selectedUnit
      }
      setItems((prev) => [...prev, orderItem])
    }

    setQuantity(1)
    setSelectedProductId('')
    setSelectedUnit('kg')
    toast.success('Ürün sipariş listesine eklendi')
  }

  function updateItemQuantity(index: number, nextValue: number) {
    setItems((prev) => prev.map((item, idx) => {
      if (idx !== index) return item
      const adjusted = Math.max(1, nextValue)
      return {
        ...item,
        miktar: adjusted,
        toplam_fiyat: Number((adjusted * item.birim_fiyat).toFixed(2))
      }
    }))
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  async function handleReceiptSelect(file: File | null) {
    if (!file) {
      setReceiptFile(null)
      setReceiptPreview('')
      return
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Yalnızca JPG, PNG, WEBP veya PDF yükleyebilirsiniz')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('Dosya boyutu en fazla 8 MB olmalıdır')
      return
    }

    setReceiptFile(file)

    if (file.type.startsWith('image/')) {
      const reader = new FileReader()
      reader.onload = () => setReceiptPreview(String(reader.result))
      reader.readAsDataURL(file)
    } else {
      setReceiptPreview('')
    }
  }

  async function uploadReceipt() {
    if (!receiptFile) {
      throw new Error('Sipariş fişi ekleyin')
    }

    const fileBase64 = await toBase64(receiptFile)
    const result = await supabase.functions.invoke('image-storage-upload', {
      body: {
        imageData: fileBase64,
        bucketName: 'urun-gorselleri',
        fileName: `xml-siparis-fis-${Date.now()}-${receiptFile.name.replace(/\.[^/.]+$/, '')}`
      }
    })

    if (result.error || result.data?.error) {
      throw new Error(result.data?.error?.message || result.error?.message || 'Fiş yüklenemedi')
    }

    return {
      url: result.data?.data?.publicUrl,
      fileName: result.data?.data?.fileName || receiptFile.name,
      contentType: result.data?.data?.contentType || receiptFile.type
    }
  }

  async function createOrder() {
    if (!user || !musteriData) {
      toast.error('Önce giriş yapmanız gerekiyor')
      return
    }

    if (!customerName.trim()) {
      toast.error('Müşteri adını yazın')
      return
    }

    if (items.length === 0) {
      toast.error('En az bir ürün ekleyin')
      return
    }

    setSubmitting(true)

    try {
      let receiptUrl = ''
      let receiptFileName = ''
      let receiptType = ''

      if (receiptFile) {
        const uploaded = await uploadReceipt()
        receiptUrl = uploaded.url
        receiptFileName = uploaded.fileName
        receiptType = uploaded.contentType
      }

      const orderPayload = {
        siparis_no: `XML-${Date.now()}`,
        musteri_id: musteriData.id,
        toplam_tutar: Number(items.reduce((sum, item) => sum + item.toplam_fiyat, 0).toFixed(2)),
        siparis_durumu: 'beklemede',
        odeme_durumu: 'beklemede',
        adres: musteriData.adres || '',
        telefon: musteriData.telefon || '',
        xml_musteri_adi: customerName.trim(),
        siparis_fis_url: receiptUrl,
        siparis_fis_adi: receiptFileName,
        siparis_fis_turu: receiptType
      }

      const { data: order, error: orderError } = await supabase
        .from('siparisler')
        .insert(orderPayload)
        .select()
        .single()

      if (orderError) throw orderError

      const siparisUrunleri = items.map((item) => ({
        siparis_id: order.id,
        urun_id: item.urun_id,
        birim_turu: item.birim_turu,
        birim_adedi: item.birim_adedi,
        birim_adedi_turu: item.birim_adedi_turu || item.birim_turu,
        miktar: item.miktar,
        birim_fiyat: item.birim_fiyat,
        toplam_fiyat: item.toplam_fiyat
      }))

      const { error: linesError } = await supabase.from('siparis_urunleri').insert(siparisUrunleri)
      if (linesError) throw linesError

      toast.success('Siparişiniz başarıyla gönderildi')
      setItems([])
      setCustomerName('')
      setReceiptFile(null)
      setReceiptPreview('')
      navigate('/hesabim')
    } catch (error: any) {
      console.error('Sipariş oluşturma hatası:', error)
      toast.error(error.message || 'Sipariş oluşturulurken hata oluştu')
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <div className="inline-block w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">XML Sipariş Gönder</h1>
        <p className="mt-2 text-gray-600">Ürünleri ekleyin, müşteri adını belirtin ve sipariş fişini ekleyin.</p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6 rounded-xl bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">Ürün</label>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
              >
                <option value="">Ürün seçin</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.urun_adi}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Birim</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
              >
                {selectedProduct?.stoklar?.length ? (
                  selectedProduct.stoklar.map((stock: any) => (
                    <option key={`${stock.urun_id}-${stock.birim_turu}-${stock.birim_adedi || 'na'}`} value={stock.birim_turu}>
                      {stock.birim_turu}
                    </option>
                  ))
                ) : (
                  <option value="kg">kg</option>
                )}
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[120px_1fr_auto] md:items-end">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Miktar</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
              />
            </div>
            <div className="text-sm text-gray-600">
              {selectedProduct ? (
                <>
                  <div className="font-medium">Birim fiyat</div>
                  <div className="text-lg font-bold text-orange-600">
                    {Number(
                      (selectedProduct.stoklar?.find((stock: any) => stock.birim_turu === selectedUnit)?.fiyat || selectedProduct.fiyat || 0)
                    ).toFixed(2)} ₺
                  </div>
                </>
              ) : (
                <div className="text-gray-500">Ürün seçerek fiyatı görün</div>
              )}
            </div>
            <button
              type="button"
              onClick={addItemFromSelection}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 font-semibold text-white hover:bg-violet-700"
            >
              <Plus className="h-4 w-4" />
              Ekle
            </button>
          </div>

          <div className="space-y-3">
            {items.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-500">
                <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-gray-400" />
                Henüz ürün eklenmedi.
              </div>
            ) : (
              items.map((item, index) => (
                <div key={`${item.urun_id}-${item.birim_turu}-${index}`} className="flex flex-col gap-3 rounded-lg border border-gray-200 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="font-semibold text-gray-900">{item.urun_adi}</div>
                    <div className="text-sm text-gray-600">{item.birim_turu} / {item.birim_fiyat.toFixed(2)} ₺</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(index, item.miktar - 1)}
                      className="h-9 w-9 rounded-lg border border-gray-300 text-gray-700"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={1}
                      value={item.miktar}
                      onChange={(e) => updateItemQuantity(index, Number(e.target.value) || 1)}
                      className="w-20 rounded-lg border border-gray-300 px-2 py-2 text-center"
                    />
                    <button
                      type="button"
                      onClick={() => updateItemQuantity(index, item.miktar + 1)}
                      className="h-9 w-9 rounded-lg border border-gray-300 text-gray-700"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="ml-2 text-red-600 hover:text-red-700"
                      aria-label="Kaldır"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="font-bold text-gray-900">{item.toplam_fiyat.toFixed(2)} ₺</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6 rounded-xl bg-white p-5 shadow-sm">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Müşteri adı</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Müşteri / firma adı"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">Sipariş fişi</label>
            <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-violet-300 bg-violet-50 p-5 text-center text-violet-700">
              <Upload className="h-6 w-6" />
              <span className="text-sm font-medium">JPG, PNG, WEBP veya PDF yükleyin</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                className="hidden"
                onChange={(e) => handleReceiptSelect(e.target.files?.[0] || null)}
              />
            </label>

            {receiptFile && (
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">{receiptFile.name}</div>
                    <div className="text-xs text-gray-500">{(receiptFile.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  <button type="button" onClick={() => handleReceiptSelect(null)} className="text-gray-500 hover:text-red-600">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {receiptPreview && (
                  <img src={receiptPreview} alt="Fiş önizleme" className="mt-3 max-h-48 w-full rounded-lg object-contain" />
                )}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-gray-50 p-4">
            <div className="text-sm text-gray-600">Toplam</div>
            <div className="mt-1 text-3xl font-bold text-orange-600">
              {items.reduce((sum, item) => sum + item.toplam_fiyat, 0).toFixed(2)} ₺
            </div>
          </div>

          <button
            type="button"
            onClick={createOrder}
            disabled={submitting}
            className="w-full rounded-lg bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            {submitting ? 'Gönderiliyor...' : 'Siparişi Gönder'}
          </button>
        </div>
      </div>
    </div>
  )
}

async function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Dosya okunamadı'))
    reader.readAsDataURL(file)
  })
}
