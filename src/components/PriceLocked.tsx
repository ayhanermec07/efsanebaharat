import { Link } from 'react-router-dom'
import { LockKeyhole } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

// Fiyatı göremeyen ziyaretçiye gösterilen kısa bilgi.
export default function PriceLocked({ compact = false }: { compact?: boolean }) {
  const { user } = useAuth()
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-muted">
        <LockKeyhole className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Fiyatlar bayilere özel</span>
      </div>
    )
  }
  return (
    <div className="rounded-lg border border-zinc-200 bg-brand-soft p-4 text-sm">
      <div className="flex items-center gap-2 font-bold text-zinc-950">
        <LockKeyhole className="h-4 w-4" aria-hidden="true" />
        Fiyatlar yalnızca bayilerimize gösterilir
      </div>
      <p className="mt-2 leading-6 text-zinc-600">
        {user
          ? 'Hesabınız bayi olarak onaylandığında fiyatları görüp sipariş verebilirsiniz. Bilgi için bizimle iletişime geçin.'
          : 'Bayi hesabınızla giriş yaparak fiyatları görebilir ve sipariş verebilirsiniz.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {!user && <Link to="/giris" className="shop-btn-secondary px-3 text-sm">Bayi girişi</Link>}
        <Link to="/bize-ulasin" className="shop-btn-secondary px-3 text-sm">Bize ulaşın</Link>
      </div>
    </div>
  )
}
