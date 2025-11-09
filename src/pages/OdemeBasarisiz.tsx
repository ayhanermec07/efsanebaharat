import { Link } from 'react-router-dom'
import { XCircle } from 'lucide-react'

export default function OdemeBasarisiz() {
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-sm p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-12 h-12 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-4">Ödeme Başarısız</h1>
        
        <p className="text-gray-600 mb-8">
          Üzgünüz, ödemeniz işlenemedi.
          <br />
          Lütfen tekrar deneyin veya farklı bir ödeme yöntemi kullanın.
        </p>

        <div className="space-y-3">
          <Link
            to="/sepet"
            className="block w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 transition"
          >
            Sepete Dön
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
