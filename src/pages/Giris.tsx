import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { LogIn, Store, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

type GirisTipi = 'musteri' | 'bayi'

export default function Giris() {
  const [girisTipi, setGirisTipi] = useState<GirisTipi>('musteri')
  const [bayiiKodu, setBayiiKodu] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (girisTipi === 'bayi') {
        // Bayi girişi: Bayii kodu ve email eşleştirmesi kontrolü
        if (!bayiiKodu) {
          throw new Error('Bayii kodu giriniz')
        }

        // Bayii kodu ve email'in eşleşip eşleşmediğini kontrol et
        const { data: bayiData, error: bayiError } = await supabase
          .from('bayiler')
          .select('*')
          .eq('bayii_kodu', bayiiKodu.toUpperCase())
          .eq('email', email.toLowerCase())
          .maybeSingle()

        if (bayiError) throw bayiError

        if (!bayiData) {
          throw new Error('Bayii kodu veya email hatalı')
        }

        if (!bayiData.aktif) {
          throw new Error('Bayi hesabınız pasif durumda. Lütfen yönetici ile iletişime geçin')
        }

        // Normal auth ile giriş yap
        const { error: authError } = await signIn(email, password)
        if (authError) throw authError

        // Başarılı bayi girişi
        toast.success(`Hoş geldiniz, ${bayiData.bayi_adi}`)
        
        // Bayi dashboard'a yönlendir
        navigate('/bayi-dashboard')
      } else {
        // Müşteri girişi (normal)
        const { error } = await signIn(email, password)
        if (error) throw error

        const redirect = searchParams.get('redirect') || '/'
        navigate(redirect)
      }
    } catch (err: any) {
      console.error('Giriş hatası:', err)
      setError(err.message || 'Giriş yapılırken bir hata oluştu')
      toast.error(err.message || 'Giriş başarısız')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mx-auto mb-4 flex items-center justify-center">
              <LogIn className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Giriş Yap</h1>
            <p className="text-gray-600 mt-2">Hesabınıza giriş yapın</p>
          </div>

          {/* Giriş Tipi Toggle */}
          <div className="mb-6 bg-gray-100 p-1 rounded-lg flex">
            <button
              type="button"
              onClick={() => setGirisTipi('musteri')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${
                girisTipi === 'musteri'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <User className="w-4 h-4" />
              Müşteri
            </button>
            <button
              type="button"
              onClick={() => setGirisTipi('bayi')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition flex items-center justify-center gap-2 ${
                girisTipi === 'bayi'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Store className="w-4 h-4" />
              Bayi
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {girisTipi === 'bayi' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bayii Kodu *
                </label>
                <input
                  type="text"
                  value={bayiiKodu}
                  onChange={(e) => setBayiiKodu(e.target.value.toUpperCase())}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent font-mono"
                  placeholder="BAY123456"
                  minLength={5}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Size atanan bayii kodunu girin
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                E-posta
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="ornek@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Şifre
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Giriş Yapılıyor...
                </>
              ) : (
                <>
                  {girisTipi === 'bayi' ? <Store className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  {girisTipi === 'bayi' ? 'Bayi Olarak Giriş Yap' : 'Giriş Yap'}
                </>
              )}
            </button>
          </form>

          {girisTipi === 'musteri' && (
            <div className="mt-6 text-center">
              <p className="text-gray-600">
                Hesabınız yok mu?{' '}
                <Link to="/kayit" className="text-orange-600 hover:text-orange-700 font-semibold">
                  Kayıt Ol
                </Link>
              </p>
            </div>
          )}

          {girisTipi === 'bayi' && (
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Bayi olmak için lütfen bizimle iletişime geçin
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
