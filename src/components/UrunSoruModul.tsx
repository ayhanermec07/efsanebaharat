import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MessageSquare, Send } from 'lucide-react'
import toast from 'react-hot-toast'

interface UrunSoruModulProps {
  urunId: string
  urunAdi: string
}

export default function UrunSoruModul({ urunId, urunAdi }: UrunSoruModulProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [soruMetni, setSoruMetni] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!user) {
      toast.error('Soru sormak için giriş yapmalısınız')
      navigate('/giris', { state: { from: `/urun/${urunId}` } })
      return
    }

    if (soruMetni.trim().length < 10) {
      toast.error('Soru en az 10 karakter olmalıdır')
      return
    }

    if (soruMetni.trim().length > 1000) {
      toast.error('Soru en fazla 1000 karakter olabilir')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase
        .from('sorular')
        .insert([{
          kullanici_id: user.id,
          urun_id: urunId,
          konu: `Ürün Hakkında: ${urunAdi}`,
          soru_metni: soruMetni.trim(),
          durum: 'beklemede'
        }])

      if (error) throw error

      setSoruMetni('')
      setShowForm(false)
      toast.success('Sorunuz başarıyla gönderildi. En kısa sürede cevaplanacaktır.')
    } catch (error: any) {
      console.error('Soru gönderme hatası:', error)
      toast.error(error.message || 'Bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-12 border-t pt-8">
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-start space-x-3 mb-4">
          <MessageSquare className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Ürün Hakkında Soru Sorun
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Bu ürün hakkında merak ettiklerinizi sorabilirsiniz. 
              Uzman ekibimiz en kısa sürede size geri dönüş yapacaktır.
            </p>

            {!showForm ? (
              <button
                onClick={() => {
                  if (!user) {
                    toast.error('Soru sormak için giriş yapmalısınız')
                    navigate('/giris', { state: { from: `/urun/${urunId}` } })
                  } else {
                    setShowForm(true)
                  }
                }}
                className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition text-sm font-medium"
              >
                Soru Sor
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <textarea
                    value={soruMetni}
                    onChange={(e) => setSoruMetni(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-y"
                    placeholder="Sorunuzu buraya yazın..."
                    rows={4}
                    minLength={10}
                    maxLength={1000}
                    required
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-gray-500">
                      Minimum 10, maksimum 1000 karakter
                    </p>
                    <p className={`text-sm ${
                      soruMetni.length > 950 
                        ? 'text-red-600 font-medium' 
                        : 'text-gray-500'
                    }`}>
                      {soruMetni.length} / 1000
                    </p>
                  </div>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={loading || soruMetni.trim().length < 10}
                    className="flex-1 bg-orange-600 text-white py-2 px-4 rounded-lg hover:bg-orange-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm font-medium"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Gönderiliyor...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Gönder</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setSoruMetni('')
                    }}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
                  >
                    İptal
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
