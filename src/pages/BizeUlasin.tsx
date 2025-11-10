import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { MessageSquare, Send, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const KONULAR = [
  'Genel Sorular',
  'Sipariş Takibi',
  'İade/Değişim',
  'Teknik Destek',
  'Öneriler'
]

export default function BizeUlasin() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    konu: KONULAR[0],
    soru_metni: ''
  })

  const [errors, setErrors] = useState({
    soru_metni: ''
  })

  useEffect(() => {
    if (!authLoading && !user) {
      toast.error('Bu sayfayı görüntülemek için giriş yapmalısınız')
      navigate('/giris', { state: { from: '/bize-ulasin' } })
    }
  }, [user, authLoading, navigate])

  function validateForm() {
    const newErrors = { soru_metni: '' }
    let isValid = true

    if (formData.soru_metni.trim().length < 10) {
      newErrors.soru_metni = 'Soru en az 10 karakter olmalıdır'
      isValid = false
    } else if (formData.soru_metni.trim().length > 1000) {
      newErrors.soru_metni = 'Soru en fazla 1000 karakter olabilir'
      isValid = false
    }

    setErrors(newErrors)
    return isValid
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!validateForm()) {
      toast.error('Lütfen formu doğru şekilde doldurun')
      return
    }

    if (!user) {
      toast.error('Giriş yapmalısınız')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('sorular')
        .insert([{
          kullanici_id: user.id,
          konu: formData.konu,
          soru_metni: formData.soru_metni.trim(),
          durum: 'beklemede'
        }])

      if (error) throw error

      setSuccess(true)
      setFormData({
        konu: KONULAR[0],
        soru_metni: ''
      })
      toast.success('Sorunuz başarıyla gönderildi')

      setTimeout(() => {
        setSuccess(false)
      }, 5000)
    } catch (error: any) {
      console.error('Soru gönderme hatası:', error)
      toast.error(error.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Yükleniyor...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-orange-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Bize Ulaşın</h1>
            <p className="text-gray-600">
              Sorularınızı, önerilerinizi veya sorunlarınızı bizimle paylaşın. 
              En kısa sürede size geri dönüş yapacağız.
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-900">Mesajınız Alındı</h3>
                  <p className="text-sm text-green-700">
                    Sorunuz başarıyla iletildi. En kısa sürede size geri dönüş yapacağız.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="bg-white rounded-lg shadow-sm p-6 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Konu Seçimi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Konu <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.konu}
                  onChange={(e) => setFormData({ ...formData, konu: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  {KONULAR.map((konu) => (
                    <option key={konu} value={konu}>
                      {konu}
                    </option>
                  ))}
                </select>
              </div>

              {/* Soru Metni */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sorunuz veya Mesajınız <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formData.soru_metni}
                  onChange={(e) => setFormData({ ...formData, soru_metni: e.target.value })}
                  className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent min-h-[200px] resize-y ${
                    errors.soru_metni ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Sorunuzu veya mesajınızı buraya yazın..."
                  minLength={10}
                  maxLength={1000}
                  required
                />
                <div className="flex items-center justify-between mt-2">
                  <div>
                    {errors.soru_metni && (
                      <p className="text-sm text-red-600">{errors.soru_metni}</p>
                    )}
                  </div>
                  <p className={`text-sm ${
                    formData.soru_metni.length > 950 
                      ? 'text-red-600 font-medium' 
                      : 'text-gray-500'
                  }`}>
                    {formData.soru_metni.length} / 1000 karakter
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || formData.soru_metni.trim().length < 10}
                className={`w-full py-3 px-6 rounded-lg font-medium transition flex items-center justify-center space-x-2 ${
                  loading || formData.soru_metni.trim().length < 10
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    <span>Gönderiliyor...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>
                      {formData.soru_metni.trim().length < 10 
                        ? `Gönder (En az ${10 - formData.soru_metni.trim().length} karakter daha)`
                        : 'Gönder'
                      }
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info Box */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">Bilgilendirme</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Sorularınız en geç 24 saat içerisinde cevaplanacaktır.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Acil durumlar için telefon ile iletişime geçebilirsiniz.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Ürün hakkında özel sorularınız için ürün detay sayfasındaki soru-cevap bölümünü kullanabilirsiniz.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Sorunuzun durumunu hesabınızdan takip edebilirsiniz.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
