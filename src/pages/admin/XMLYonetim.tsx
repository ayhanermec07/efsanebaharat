import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { FileCode, RefreshCw, Download, Copy, Check, Key, Eye, EyeOff, Package, CheckCircle, XCircle, AlertTriangle, Activity } from 'lucide-react'
import toast from 'react-hot-toast'
import { generateXMLContent, downloadXML, generateSecureToken, copyToClipboard, XMLProduct } from '../../utils/xmlGenerator'

interface SelectedProduct {
    id: string
    urun_adi: string
    birim_adedi: number
    birim_turu: string
    fiyat: number
    stok_miktari: number
    stok_birimi: string
    kategori_adi: string
    marka_adi: string
    gorsel_url: string | null
}

interface XMLHealthStatus {
    isHealthy: boolean
    lastCheck: Date | null
    errors: XMLError[]
    warnings: string[]
}

interface XMLError {
    id: string
    message: string
    timestamp: Date
    type: 'error' | 'warning'
}

export default function XMLYonetim() {
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [xmlSettings, setXmlSettings] = useState<any>(null)
    const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([])
    const [showToken, setShowToken] = useState(false)
    const [copied, setCopied] = useState(false)
    const [lastGeneratedXML, setLastGeneratedXML] = useState<string | null>(null)
    const [healthStatus, setHealthStatus] = useState<XMLHealthStatus>({
        isHealthy: true,
        lastCheck: null,
        errors: [],
        warnings: []
    })
    const [checking, setChecking] = useState(false)

    useEffect(() => {
        loadData()
    }, [])

    async function loadData() {
        setLoading(true)

        try {
            // XML ayarlarını çek
            const { data: settings } = await supabase
                .from('bayi_xml_settings')
                .select('*')
                .limit(1)
                .maybeSingle()

            setXmlSettings(settings)

            // XML'e seçili ürünleri çek
            const { data: stoklar } = await supabase
                .from('urun_stoklari')
                .select('id, urun_id, birim_adedi, birim_turu, fiyat, stok_miktari, stok_birimi')
                .eq('xml_export', true)
                .eq('aktif_durum', true)

            if (stoklar && stoklar.length > 0) {
                // Ürün detaylarını çek
                const urunIds = [...new Set(stoklar.map(s => s.urun_id))]

                const [{ data: urunler }, { data: kategoriler }, { data: markalar }, { data: gorseller }] = await Promise.all([
                    supabase.from('urunler').select('id, urun_adi, kategori_id, marka_id').in('id', urunIds),
                    supabase.from('kategoriler').select('id, kategori_adi'),
                    supabase.from('markalar').select('id, marka_adi'),
                    supabase.from('urun_gorselleri').select('urun_id, gorsel_url, sira_no').in('urun_id', urunIds).order('sira_no', { ascending: true })
                ])

                const products: SelectedProduct[] = stoklar.map(stok => {
                    const urun = urunler?.find(u => u.id === stok.urun_id)
                    const kategori = kategoriler?.find(k => k.id === urun?.kategori_id)
                    const marka = markalar?.find(m => m.id === urun?.marka_id)
                    const gorsel = gorseller?.find(g => g.urun_id === stok.urun_id)

                    return {
                        id: stok.id,
                        urun_adi: urun?.urun_adi || 'Bilinmeyen Ürün',
                        birim_adedi: stok.birim_adedi,
                        birim_turu: stok.birim_turu,
                        fiyat: stok.fiyat,
                        stok_miktari: stok.stok_miktari,
                        stok_birimi: stok.stok_birimi,
                        kategori_adi: kategori?.kategori_adi || '',
                        marka_adi: marka?.marka_adi || '',
                        gorsel_url: gorsel?.gorsel_url || null
                    }
                })

                setSelectedProducts(products)
            } else {
                setSelectedProducts([])
            }
        } catch (error: any) {
            console.error('Veri yükleme hatası:', error)
            toast.error('Veriler yüklenirken hata oluştu')
            addError('Veri yükleme hatası: ' + (error.message || 'Bilinmeyen hata'), 'error')
        }

        setLoading(false)
    }

    function addError(message: string, type: 'error' | 'warning') {
        const newError: XMLError = {
            id: Date.now().toString(),
            message,
            timestamp: new Date(),
            type
        }
        setHealthStatus(prev => ({
            ...prev,
            isHealthy: type === 'warning' ? prev.isHealthy : false,
            errors: [newError, ...prev.errors].slice(0, 10) // Son 10 hata
        }))
    }

    function clearErrors() {
        setHealthStatus(prev => ({
            ...prev,
            isHealthy: true,
            errors: []
        }))
        toast.success('Hata geçmişi temizlendi')
    }

    async function runHealthCheck() {
        setChecking(true)
        const warnings: string[] = []
        let hasErrors = false

        try {
            // 1. Veritabanı bağlantısı kontrolü
            const { error: dbError } = await supabase.from('bayi_xml_settings').select('id').limit(1)
            if (dbError) {
                addError('Veritabanı bağlantı hatası: ' + dbError.message, 'error')
                hasErrors = true
            }

            // 2. Token kontrolü
            if (!xmlSettings?.xml_token) {
                warnings.push('Erişim token\'ı henüz oluşturulmamış')
            }

            // 3. Ürün kontrolü
            if (selectedProducts.length === 0) {
                warnings.push('XML\'e dahil edilecek ürün seçilmemiş')
            }

            // 4. Stok kontrolü - 0 stoklu ürünler
            const outOfStock = selectedProducts.filter(p => p.stok_miktari <= 0)
            if (outOfStock.length > 0) {
                warnings.push(`${outOfStock.length} üründe stok yok`)
            }

            // 5. Fiyat kontrolü - 0 fiyatlı ürünler
            const zeroPriceProducts = selectedProducts.filter(p => p.fiyat <= 0)
            if (zeroPriceProducts.length > 0) {
                warnings.push(`${zeroPriceProducts.length} üründe fiyat 0 veya eksik`)
            }

            // 6. Görsel kontrolü
            const noImageProducts = selectedProducts.filter(p => !p.gorsel_url)
            if (noImageProducts.length > 0) {
                warnings.push(`${noImageProducts.length} üründe görsel yok`)
            }

            setHealthStatus(prev => ({
                ...prev,
                isHealthy: !hasErrors,
                lastCheck: new Date(),
                warnings
            }))

            if (!hasErrors && warnings.length === 0) {
                toast.success('Sistem sağlık kontrolü başarılı!')
            } else if (!hasErrors) {
                toast.success(`Kontrol tamamlandı. ${warnings.length} uyarı var.`)
            }

        } catch (error: any) {
            console.error('Sağlık kontrolü hatası:', error)
            addError('Sağlık kontrolü yapılamadı: ' + (error.message || 'Bilinmeyen hata'), 'error')
        }

        setChecking(false)
    }

    async function handleGenerateXML() {
        if (selectedProducts.length === 0) {
            toast.error('XML\'e gönderilecek ürün seçilmemiş!')
            return
        }

        setGenerating(true)

        try {
            // XML ürün listesi oluştur
            const xmlProducts: XMLProduct[] = selectedProducts.map(p => ({
                id: p.id,
                name: `${p.urun_adi} ${p.birim_adedi} ${p.birim_turu.toUpperCase()}`,
                price: p.fiyat,
                stock: p.stok_miktari,
                unit: p.stok_birimi.toUpperCase(),
                unitAmount: p.birim_adedi,
                image: p.gorsel_url || '',
                category: p.kategori_adi,
                brand: p.marka_adi
            }))

            const xmlContent = generateXMLContent(xmlProducts)
            setLastGeneratedXML(xmlContent)

            // Son güncelleme zamanını kaydet
            if (xmlSettings) {
                await supabase
                    .from('bayi_xml_settings')
                    .update({ last_updated_at: new Date().toISOString() })
                    .eq('id', xmlSettings.id)

                setXmlSettings({ ...xmlSettings, last_updated_at: new Date().toISOString() })
            }

            toast.success(`XML başarıyla oluşturuldu! (${xmlProducts.length} ürün)`)
        } catch (error: any) {
            console.error('XML oluşturma hatası:', error)
            toast.error('XML oluşturulurken hata oluştu')
        }

        setGenerating(false)
    }

    function handleDownloadXML() {
        if (!lastGeneratedXML) {
            toast.error('Önce XML oluşturun!')
            return
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
        downloadXML(lastGeneratedXML, `bayi-urunler-${timestamp}.xml`)
        toast.success('XML dosyası indirildi!')
    }

    async function handleGenerateNewToken() {
        if (!confirm('Yeni token oluşturulacak. Mevcut erişimler geçersiz olacak. Devam edilsin mi?')) {
            return
        }

        try {
            const newToken = generateSecureToken()

            if (xmlSettings) {
                await supabase
                    .from('bayi_xml_settings')
                    .update({ xml_token: newToken, updated_at: new Date().toISOString() })
                    .eq('id', xmlSettings.id)

                setXmlSettings({ ...xmlSettings, xml_token: newToken })
                toast.success('Yeni token oluşturuldu!')
            } else {
                // İlk token
                const { data } = await supabase
                    .from('bayi_xml_settings')
                    .insert({ xml_token: newToken, auto_update_enabled: false, update_interval_minutes: 15 })
                    .select()
                    .maybeSingle()

                if (data) {
                    setXmlSettings(data)
                    toast.success('Token oluşturuldu!')
                }
            }
        } catch (error: any) {
            console.error('Token oluşturma hatası:', error)
            toast.error('Token oluşturulurken hata oluştu')
        }
    }

    async function handleCopyToken() {
        if (!xmlSettings?.xml_token) return

        const success = await copyToClipboard(xmlSettings.xml_token)
        if (success) {
            setCopied(true)
            toast.success('Token kopyalandı!')
            setTimeout(() => setCopied(false), 2000)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="max-w-6xl">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <FileCode className="w-8 h-8 text-orange-600" />
                    <h1 className="text-3xl font-bold text-gray-900">Bayi XML Yönetimi</h1>
                </div>
                <button
                    onClick={loadData}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                >
                    <RefreshCw className="w-4 h-4" />
                    Yenile
                </button>
            </div>

            {/* Sistem Durum Kontrol Paneli */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-600" />
                        Sistem Durum Paneli
                    </h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={runHealthCheck}
                            disabled={checking}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                        >
                            {checking ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                                <Activity className="w-4 h-4" />
                            )}
                            Kontrol Et
                        </button>
                    </div>
                </div>

                {/* Durum Kartları */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    {/* Ana Durum */}
                    <div className={`rounded-lg p-4 ${healthStatus.isHealthy ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {healthStatus.isHealthy ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            <span className={`font-semibold ${healthStatus.isHealthy ? 'text-green-700' : 'text-red-700'}`}>
                                {healthStatus.isHealthy ? 'Çalışıyor' : 'Hata Var'}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">
                            {healthStatus.lastCheck
                                ? `Son kontrol: ${healthStatus.lastCheck.toLocaleTimeString('tr-TR')}`
                                : 'Henüz kontrol edilmedi'}
                        </p>
                    </div>

                    {/* Token Durumu */}
                    <div className={`rounded-lg p-4 ${xmlSettings?.xml_token ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {xmlSettings?.xml_token ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            )}
                            <span className={`font-semibold ${xmlSettings?.xml_token ? 'text-green-700' : 'text-yellow-700'}`}>
                                Token
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">
                            {xmlSettings?.xml_token ? 'Aktif' : 'Oluşturulmamış'}
                        </p>
                    </div>

                    {/* Ürün Sayısı */}
                    <div className={`rounded-lg p-4 ${selectedProducts.length > 0 ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {selectedProducts.length > 0 ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                            )}
                            <span className={`font-semibold ${selectedProducts.length > 0 ? 'text-green-700' : 'text-yellow-700'}`}>
                                Ürünler
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">
                            {selectedProducts.length} ürün seçili
                        </p>
                    </div>

                    {/* Hata Sayısı */}
                    <div className={`rounded-lg p-4 ${healthStatus.errors.length === 0 ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                        <div className="flex items-center gap-2 mb-2">
                            {healthStatus.errors.length === 0 ? (
                                <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                                <XCircle className="w-5 h-5 text-red-600" />
                            )}
                            <span className={`font-semibold ${healthStatus.errors.length === 0 ? 'text-green-700' : 'text-red-700'}`}>
                                Hatalar
                            </span>
                        </div>
                        <p className="text-sm text-gray-600">
                            {healthStatus.errors.length} hata kaydı
                        </p>
                    </div>
                </div>

                {/* Uyarılar */}
                {healthStatus.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                        <h3 className="font-semibold text-yellow-800 flex items-center gap-2 mb-2">
                            <AlertTriangle className="w-4 h-4" />
                            Uyarılar ({healthStatus.warnings.length})
                        </h3>
                        <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
                            {healthStatus.warnings.map((warning, index) => (
                                <li key={index}>{warning}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Hata Geçmişi */}
                {healthStatus.errors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-red-800 flex items-center gap-2">
                                <XCircle className="w-4 h-4" />
                                Hata Geçmişi ({healthStatus.errors.length})
                            </h3>
                            <button
                                onClick={clearErrors}
                                className="text-sm text-red-600 hover:text-red-800 transition"
                            >
                                Temizle
                            </button>
                        </div>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {healthStatus.errors.map((error) => (
                                <div key={error.id} className="bg-white rounded p-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className={error.type === 'error' ? 'text-red-700' : 'text-yellow-700'}>
                                            {error.message}
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            {error.timestamp.toLocaleTimeString('tr-TR')}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Token Yönetimi */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Key className="w-5 h-5 text-orange-600" />
                    Erişim Token'ı
                </h2>

                {xmlSettings?.xml_token ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="flex-1 bg-gray-100 rounded-lg px-4 py-3 font-mono text-sm">
                                {showToken ? xmlSettings.xml_token : '••••••••••••••••••••••••••••••••'}
                            </div>
                            <button
                                onClick={() => setShowToken(!showToken)}
                                className="p-2 text-gray-500 hover:text-gray-700 transition"
                                title={showToken ? 'Gizle' : 'Göster'}
                            >
                                {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                            <button
                                onClick={handleCopyToken}
                                className="p-2 text-gray-500 hover:text-gray-700 transition"
                                title="Kopyala"
                            >
                                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                            </button>
                        </div>

                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleGenerateNewToken}
                                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm"
                            >
                                Yeni Token Oluştur
                            </button>
                            <p className="text-sm text-gray-500">
                                Bu token ile bayiler XML'e erişebilir
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-6">
                        <p className="text-gray-500 mb-4">Henüz erişim token'ı oluşturulmamış</p>
                        <button
                            onClick={handleGenerateNewToken}
                            className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                        >
                            Token Oluştur
                        </button>
                    </div>
                )}
            </div>

            {/* XML Durumu */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-orange-600" />
                    XML Durumu
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-orange-50 rounded-lg p-4">
                        <p className="text-sm text-orange-600 mb-1">Seçili Ürün Sayısı</p>
                        <p className="text-2xl font-bold text-orange-700">{selectedProducts.length}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-blue-600 mb-1">Son Güncelleme</p>
                        <p className="text-sm font-medium text-blue-700">
                            {xmlSettings?.last_updated_at
                                ? new Date(xmlSettings.last_updated_at).toLocaleString('tr-TR')
                                : 'Henüz oluşturulmadı'}
                        </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-4">
                        <p className="text-sm text-green-600 mb-1">XML Oluşturuldu</p>
                        <p className="text-sm font-medium text-green-700">
                            {lastGeneratedXML ? 'Evet - İndirmeye hazır' : 'Hayır'}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={handleGenerateXML}
                        disabled={generating || selectedProducts.length === 0}
                        className="flex items-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {generating ? (
                            <RefreshCw className="w-5 h-5 animate-spin" />
                        ) : (
                            <FileCode className="w-5 h-5" />
                        )}
                        XML Oluştur
                    </button>

                    <button
                        onClick={handleDownloadXML}
                        disabled={!lastGeneratedXML}
                        className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download className="w-5 h-5" />
                        XML İndir
                    </button>
                </div>
            </div>

            {/* Seçili Ürünler Listesi */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b bg-gray-50">
                    <h2 className="text-lg font-semibold text-gray-900">
                        XML'e Dahil Edilecek Ürünler ({selectedProducts.length})
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                        Ürün Yönetimi sayfasından stok varyasyonlarındaki XML kutucuğunu işaretleyerek ürün ekleyebilirsiniz
                    </p>
                </div>

                {selectedProducts.length === 0 ? (
                    <div className="px-6 py-12 text-center text-gray-500">
                        <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p>Henüz XML'e eklenmiş ürün yok</p>
                        <p className="text-sm mt-1">Ürün Yönetimi → Ürün Düzenle → Stok satırındaki XML kutucuğunu işaretleyin</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Görsel</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ürün</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Varyasyon</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fiyat</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stok</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kategori</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marka</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {selectedProducts.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            {product.gorsel_url ? (
                                                <img
                                                    src={product.gorsel_url}
                                                    alt={product.urun_adi}
                                                    className="w-10 h-10 object-cover rounded"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-gray-400" />
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{product.urun_adi}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {product.birim_adedi} {product.birim_turu.toUpperCase()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{product.fiyat.toFixed(2)} ₺</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">
                                            {product.stok_miktari} {product.stok_birimi.toUpperCase()}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{product.kategori_adi}</td>
                                        <td className="px-4 py-3 text-sm text-gray-600">{product.marka_adi}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* XML Önizleme */}
            {lastGeneratedXML && (
                <div className="bg-white rounded-lg shadow-sm mt-6 overflow-hidden">
                    <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">XML Önizleme</h2>
                        <button
                            onClick={() => setLastGeneratedXML(null)}
                            className="text-sm text-gray-500 hover:text-gray-700"
                        >
                            Kapat
                        </button>
                    </div>
                    <div className="p-4 bg-gray-900 overflow-x-auto">
                        <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap">
                            {lastGeneratedXML}
                        </pre>
                    </div>
                </div>
            )}
        </div>
    )
}
