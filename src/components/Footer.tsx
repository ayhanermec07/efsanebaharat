import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 mt-auto">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo ve Açıklama */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">E</span>
              </div>
              <span className="text-2xl font-bold text-white">EfsaneBaharat</span>
            </div>
            <p className="text-gray-400 mb-4">
              Premium kalite baharatlar ve doğal ürünler. Mutfağınıza lezzet katın.
            </p>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>0850 123 45 67</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>info@efsanebaharat.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>İstanbul, Türkiye</span>
              </div>
            </div>
          </div>

          {/* Hızlı Linkler */}
          <div>
            <h3 className="text-white font-semibold mb-4">Hızlı Linkler</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/urunler" className="hover:text-orange-500 transition">
                  Ürünler
                </Link>
              </li>
              <li>
                <Link to="/hakkimizda" className="hover:text-orange-500 transition">
                  Hakkımızda
                </Link>
              </li>
              <li>
                <Link to="/iletisim" className="hover:text-orange-500 transition">
                  İletişim
                </Link>
              </li>
            </ul>
          </div>

          {/* Müşteri Hizmetleri */}
          <div>
            <h3 className="text-white font-semibold mb-4">Müşteri Hizmetleri</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/sss" className="hover:text-orange-500 transition">
                  Sıkça Sorulan Sorular
                </Link>
              </li>
              <li>
                <Link to="/iade-kosullari" className="hover:text-orange-500 transition">
                  İade Koşulları
                </Link>
              </li>
              <li>
                <Link to="/gizlilik" className="hover:text-orange-500 transition">
                  Gizlilik Politikası
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 EfsaneBaharat.com - Tüm hakları saklıdır.</p>
        </div>
      </div>
    </footer>
  )
}
