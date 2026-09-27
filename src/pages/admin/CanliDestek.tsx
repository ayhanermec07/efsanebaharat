import { MessageCircle } from 'lucide-react'

export default function CanliDestek() {
  return (
    <div className="flex min-h-[420px] min-w-0 flex-col items-center justify-center rounded-lg border border-dashed border-amber-300 bg-amber-50 p-6 text-center">
      <MessageCircle className="h-12 w-12 text-amber-700" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">Canlı destek kanalı yapılandırılmadı</h1>
      <p className="mt-2 max-w-lg text-sm leading-6 text-gray-700">
        Kalıcı konuşma kaydı ve doğrulanmış teslimat kanalı kurulana kadar bu sayfadan mesaj gönderilemez.
        Müşteriler iletişim sayfasını veya etkinse WhatsApp bağlantısını kullanabilir.
      </p>
    </div>
  )
}
