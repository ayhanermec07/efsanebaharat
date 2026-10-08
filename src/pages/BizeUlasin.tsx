import { ArtDecoration } from '../components/ArtDecoration'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import SellerInformation from '../components/SellerInformation'
import { supabase } from '../lib/supabase'
import { Send, Check } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  
  const [formData, setFormData] = useState({
    konu: KONULAR[0],
    soru_metni: ''
  })

  const [errors, setErrors] = useState({
    soru_metni: ''
  })

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

    } catch (error: unknown) {
      console.error('Soru gönderme hatası:', error)
      toast.error('Mesajınız gönderilemedi. Lütfen tekrar deneyin.')
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

  return (
    <div className="support-contact min-h-screen py-8 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className={`support-contact-art ${success ? 'is-sent' : ''}`}>
              <ArtDecoration kind="envelope-open" className="support-envelope-open" />
              <ArtDecoration kind="envelope-closed" className="support-envelope-closed" />
              {success && <Check className="support-envelope-check" aria-hidden="true" />}
            </div>
            <h1 className="support-contact-heading text-3xl mb-2 sm:text-4xl">Bize Ulaşın</h1>
            <p className="text-gray-600">
              Sorularınızı, önerilerinizi veya sorunlarınızı bizimle paylaşın.
            </p>
          </div>

          <section aria-label="İşletme ve iletişim bilgileri" className="support-contact-paper mb-6 min-w-0 space-y-4 rounded-lg p-5 text-gray-700">
            <SellerInformation variant="contact" />
          </section>

          {success && (
            <div role="status" className="support-contact-confirmation support-contact-paper mb-6 rounded-lg">
              <h2 className="support-contact-heading text-2xl">Mesajınız bize ulaştı</h2>
              <p className="mt-3 text-sm leading-6">Bizimle paylaştığınız için teşekkür ederiz. Yanıt durumunu hesabınızdan takip edebilirsiniz.</p>
              <button type="button" onClick={() => setSuccess(false)} className="shop-btn-secondary mt-5">Yeni mesaj yaz</button>
            </div>
          )}

          {!user ? (
            <div className="rounded-lg border border-gray-200 bg-white p-6 text-center shadow-sm md:p-8">
              <p className="text-gray-700">Mesaj göndermek için hesabınıza giriş yapın. Sorunuzun yanıtını hesabınızdan takip edebilirsiniz.</p>
              <Link to="/giris" state={{ from: '/bize-ulasin' }} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-6 py-3 font-semibold text-white hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">Giriş yap</Link>
            </div>
          ) : !success && <div className="support-contact-paper rounded-lg p-5 md:p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Konu Seçimi */}
              <div>
                <label htmlFor="iletisim-konu" className="block text-sm font-medium text-gray-700 mb-2">
                  Konu <span className="text-red-500">*</span>
                </label>
                <select
                  id="iletisim-konu"
                  value={formData.konu}
                  onChange={(e) => setFormData({ ...formData, konu: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent"
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
                <label htmlFor="iletisim-mesaj" className="block text-sm font-medium text-gray-700 mb-2">
                  Sorunuz veya Mesajınız <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="iletisim-mesaj"
                  aria-invalid={Boolean(errors.soru_metni)}
                  aria-describedby={errors.soru_metni ? 'iletisim-mesaj-hata' : undefined}
                  value={formData.soru_metni}
                  onChange={(e) => setFormData({ ...formData, soru_metni: e.target.value })}
                  className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-700 focus:border-transparent min-h-[200px] resize-y ${
                    errors.soru_metni ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Sorunuzu veya mesajınızı buraya yazın..."
                  minLength={10}
                  maxLength={1000}
                  required
                />
                <div className="support-message-counter flex items-center justify-between mt-2">
                  <div>
                    {errors.soru_metni && (
                      <p id="iletisim-mesaj-hata" className="text-sm text-red-600">{errors.soru_metni}</p>
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
                    : 'bg-brand text-white hover:bg-emerald-800'
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
          </div>}

          {/* Info Box */}
          {user && <div className="support-contact-note mt-8 rounded-lg p-5">
            <h3 className="font-semibold text-blue-900 mb-3">Bilgilendirme</h3>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Ürün hakkında özel sorularınız için ürün detay sayfasındaki soru-cevap bölümünü kullanabilirsiniz.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">•</span>
                <span>Sorunuzun durumunu hesabınızdan takip edebilirsiniz.</span>
              </li>
            </ul>
          </div>}
        </div>
      </div>
    </div>
  )
}
