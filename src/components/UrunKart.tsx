import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, ShoppingCart, Check } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useSepet } from '../contexts/SepetContext'
import { kademeliIskontoUygula } from '../utils/iskonto'
import { getImageUrl } from '../utils/imageUtils'

interface UrunKartProps {
    urun: any
    kampanya?: {
        indirim_tipi: 'yuzde' | 'tutar'
        indirim_degeri: number
    } | null
    // Performans için parent'tan hesaplanıp gelebilir veya component içinde tekrar hesaplanabilir.
    // Bağımsız olması için component içinde hesaplamayı tercih ediyorum şimdilik.
}

export default function UrunKart({ urun, kampanya }: UrunKartProps) {
    const { user, grupIskontoOrani, ozelIskontoOrani } = useAuth()
    const { sepeteEkle } = useSepet()
    const navigate = useNavigate()

    const [secilenStok, setSecilenStok] = useState<any>(null)
    const [eklendi, setEklendi] = useState(false)

    const [imgError, setImgError] = useState(false)

    // İlk renderda veya ürün değiştiğinde varsayılan stoku seç
    useEffect(() => {
        if (urun.urun_stoklari && urun.urun_stoklari.length > 0) {
            setSecilenStok(urun.urun_stoklari[0])
        }
        setImgError(false)
    }, [urun])

    const ilkGorsel = getImageUrl(urun.urun_gorselleri?.[0]?.gorsel_url)

    // İskonto hesapla
    const iskontoInfo = secilenStok && user
        ? kademeliIskontoUygula(secilenStok.fiyat, grupIskontoOrani, ozelIskontoOrani)
        : null

    // Kampanya İskontosu Hesapla
    let satisFiyati = secilenStok ? secilenStok.fiyat : 0
    let eskiFiyat = secilenStok ? secilenStok.fiyat : 0
    let indirimVar = false
    let indirimOrani = 0

    if (secilenStok) {
        if (kampanya) {
            // Kampanya varsa öncelikli olarak onu uygula
            eskiFiyat = secilenStok.fiyat
            if (kampanya.indirim_tipi === 'yuzde') {
                satisFiyati = eskiFiyat * (1 - kampanya.indirim_degeri / 100)
                indirimOrani = kampanya.indirim_degeri
            } else {
                satisFiyati = Math.max(0, eskiFiyat - kampanya.indirim_degeri)
                indirimOrani = Math.round(((eskiFiyat - satisFiyati) / eskiFiyat) * 100)
            }
            indirimVar = true
        } else if (iskontoInfo && iskontoInfo.varMi) {
            // Yoksa müşteri iskontosunu uygula
            satisFiyati = iskontoInfo.yeniFiyat
            eskiFiyat = iskontoInfo.eskiFiyat
            indirimVar = true
            indirimOrani = iskontoInfo.oran
        }
    }

    const handleSepeteEkle = () => {
        if (!user) {
            navigate('/giris')
            return
        }

        if (secilenStok) {
            const fiyat = satisFiyati

            sepeteEkle({
                urun_id: urun.id,
                urun_adi: urun.urun_adi,
                birim_turu: secilenStok.birim_turu,
                birim_adedi: secilenStok.birim_adedi,
                birim_adedi_turu: secilenStok.birim_turu,
                birim_fiyat: fiyat,
                miktar: secilenStok.min_siparis_miktari || 1,
                gorsel_url: ilkGorsel,
                min_siparis_miktari: secilenStok.min_siparis_miktari
            })

            setEklendi(true)
            setTimeout(() => setEklendi(false), 2000)
        }
    }

    // Stokları gramaj sırasına göre dizmek iyi olabilir (opsiyonel, şimdilik veritabanı sırası)

    return (
        <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition overflow-hidden h-full flex flex-col">
            <Link to={`/urun/${urun.id}`} className="block relative">
                <div className="aspect-square bg-gray-100 relative overflow-hidden">
                    {ilkGorsel && !imgError ? (
                        <img
                            src={ilkGorsel}
                            alt={urun.urun_adi}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            onError={() => setImgError(true)}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
                                <span className="text-white text-4xl font-bold">
                                    {urun.urun_adi.charAt(0)}
                                </span>
                            </div>
                        </div>
                    )}
                    {indirimVar && (
                        <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-1 rounded-lg text-sm font-bold">
                            %{indirimOrani} İndirim
                        </div>
                    )}
                </div>
            </Link>

            <div className="p-4 flex flex-col flex-1">
                <div className="flex-1">
                    <Link to={`/urun/${urun.id}`}>
                        <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-orange-600 transition">
                            {urun.urun_adi}
                        </h3>
                    </Link>
                    <p className="text-sm text-gray-500 mb-3">
                        {urun.markalar?.marka_adi}
                    </p>
                </div>

                {/* Birim Seçimi - Asorti */}
                {urun.urun_stoklari && urun.urun_stoklari.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {urun.urun_stoklari.map((stok: any) => (
                            <button
                                key={stok.id}
                                onClick={() => setSecilenStok(stok)}
                                className={`flex-1 min-w-[60px] text-xs py-1.5 px-2 rounded border transition text-center ${secilenStok?.id === stok.id
                                    ? 'border-orange-600 bg-orange-50 text-orange-700 font-medium'
                                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                                    }`}
                            >
                                {stok.birim_adedi || 100} {stok.birim_turu?.toUpperCase() || 'GR'}
                            </button>
                        ))}
                    </div>
                )}

                {/* Fiyat Gösterimi */}
                {secilenStok && (
                    <div className="flex items-center justify-between mb-4 h-10">
                        <div className="flex flex-col">
                            {indirimVar ? (
                                <>
                                    <span className="text-orange-600 font-bold text-lg">
                                        {satisFiyati.toFixed(2)} ₺
                                    </span>
                                    <span className="text-gray-400 text-xs line-through">
                                        {eskiFiyat.toFixed(2)} ₺
                                    </span>
                                </>
                            ) : (
                                <span className="text-orange-600 font-bold text-lg">
                                    {secilenStok.fiyat.toFixed(2)} ₺
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Aksiyon Butonları */}
                {user ? (
                    <button
                        onClick={handleSepeteEkle}
                        disabled={!secilenStok}
                        className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition text-sm disabled:bg-gray-300 disabled:cursor-not-allowed ${eklendi
                            ? 'bg-green-600 text-white'
                            : 'bg-orange-600 text-white hover:bg-orange-700'
                            }`}
                    >
                        {eklendi ? (
                            <>
                                <Check className="w-4 h-4" />
                                <span>Eklendi</span>
                            </>
                        ) : (
                            <>
                                <ShoppingCart className="w-4 h-4" />
                                <span>Sepete Ekle</span>
                            </>
                        )}
                    </button>
                ) : (
                    <button
                        onClick={() => navigate(`/urun/${urun.id}`)}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm"
                    >
                        <Eye className="w-4 h-4" />
                        <span>Ürünü İncele</span>
                    </button>
                )}
            </div>
        </div>
    )
}
