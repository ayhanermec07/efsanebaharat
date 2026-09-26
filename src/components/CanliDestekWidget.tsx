import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, X } from 'lucide-react'
import { publicSupabase } from '../lib/supabase'

export default function CanliDestekWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [whatsapp, setWhatsapp] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void publicSupabase.from('whatsapp_numbers')
      .select('phone_number')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        const number = data?.phone_number?.replace(/\D/g, '')
        if (active && number && number.length >= 10 && number.length <= 15) setWhatsapp(number)
      })
    return () => { active = false }
  }, [])

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] sm:bottom-6 sm:right-6">
      {isOpen && (
        <div id="iletisim-secenekleri" className="mb-3 w-72 max-w-full rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-900">Bize ulaşın</h2>
            <button type="button" onClick={() => setIsOpen(false)} aria-label="İletişim seçeneklerini kapat" className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <p className="mb-3 text-sm text-gray-600">Sorunuz için iletişim sayfamızı kullanabilirsiniz.</p>
          <Link to="/bize-ulasin" onClick={() => setIsOpen(false)} className="flex min-h-11 items-center justify-center rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:bg-orange-700">
            İletişim sayfası
          </Link>
          {whatsapp && (
            <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="mt-2 flex min-h-11 items-center justify-center rounded-lg border border-green-700 px-4 text-sm font-semibold text-green-800">
              WhatsApp ile yazın
            </a>
          )}
        </div>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(value => !value)}
        aria-label="İletişim seçenekleri"
        aria-expanded={isOpen}
        aria-controls={isOpen ? 'iletisim-secenekleri' : undefined}
        className="ml-auto flex min-h-14 min-w-14 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg hover:bg-orange-700"
      >
        <MessageCircle className="h-6 w-6" aria-hidden="true" />
      </button>
    </div>
  )
}
