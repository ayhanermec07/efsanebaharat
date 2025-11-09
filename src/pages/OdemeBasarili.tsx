import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { useSepet } from '../contexts/SepetContext'

export default function OdemeBasarili() {
  const { sepetiTemizle } = useSepet()
  const navigate = useNavigate()

  useEffect(() => {
    // Sepeti temizle
    sepetiTemizle()
  }, [])

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">Ödeme Başarılı</h1>
        
        <p className="text-gray-600 mb-8">
          Siparişiniz başarıyla oluşturuldu. Ödemeniz onaylandı.
          <br />
          Siparişiniz en kısa sürede hazırlanacaktır.
        </p>

        <div className="space-y-3">
          <Link
            to="/hesabim"
            className="block w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition"
          >
            Siparişlerimi Görüntüle
          </Link>
          <Link
            to="/urunler"
            className="block w-full bg-gray-100 text-gray-700 py-3 rounded-lg hover:bg-gray-200 transition"
          >
            Alışverişe Devam Et
          </Link>
        </div>
      </div>
    </div>
  )
}
