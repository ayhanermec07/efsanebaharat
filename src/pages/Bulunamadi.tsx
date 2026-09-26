import { Link } from 'react-router-dom'
import { SearchX } from 'lucide-react'

export default function Bulunamadi() {
  return (
    <section className="shop-container py-12 sm:py-20">
      <div className="mx-auto max-w-lg min-w-0 text-center">
        <SearchX className="mx-auto h-12 w-12 text-emerald-800" aria-hidden="true" />
        <h1 className="mt-5 text-3xl font-bold text-zinc-950">Bu sayfa bulunamadı</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-600">Bağlantı değişmiş veya sayfa kaldırılmış olabilir. Ürünlere göz atarak devam edebilirsiniz.</p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link to="/urunler" className="shop-btn-primary flex min-h-11 items-center justify-center">Ürünleri gör</Link>
          <Link to="/" className="flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 font-semibold text-zinc-800 hover:bg-zinc-50">Ana sayfaya dön</Link>
        </div>
      </div>
    </section>
  )
}
