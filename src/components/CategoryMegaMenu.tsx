import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CategoryNode } from '../lib/category-hierarchy'

function CategoryBranches({ nodes, onNavigate }: { nodes: CategoryNode[]; onNavigate: () => void }) {
  return <ul className="ml-1 border-l border-brand-line pl-3">
    {nodes.map(({ category, children }) => <li key={category.id} className="min-w-0">
      <Link to={`/urunler?kategori=${category.id}`} onClick={onNavigate} className="flex min-h-11 items-center break-words rounded-md px-2 py-2 text-sm text-brand-muted hover:bg-brand-soft hover:text-brand-ink">
        {category.kategori_adi}
      </Link>
      {children.length > 0 && <CategoryBranches nodes={children} onNavigate={onNavigate} />}
    </li>)}
  </ul>
}

export default function CategoryMegaMenu({ nodes, error, onRetry, onNavigate }: { nodes: CategoryNode[]; error: boolean; onRetry: () => void; onNavigate: () => void }) {
  return <section id="header-category-tree" aria-label="Kategori ağacı" className="absolute inset-x-0 top-full border-b border-brand-line bg-brand-paper shadow-xl">
    <div className="max-h-[calc(100dvh-var(--store-header-height,120px)-80px)] overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 lg:px-8">
      {error ? <button type="button" onClick={onRetry} className="min-h-11 text-sm text-red-700">Kategoriler yüklenemedi. Tekrar dene</button>
        : nodes.length ? <div className="min-w-0 columns-1 gap-6 sm:columns-2 lg:columns-4 xl:columns-5">
          {nodes.map(({ category, children }) => <div key={category.id} className="mb-4 min-w-0 break-inside-avoid">
            <Link to={`/urunler?kategori=${category.id}`} onClick={onNavigate} className="mb-1 flex min-h-11 items-center break-words rounded-md px-2 py-2 text-sm font-bold text-brand-ink hover:bg-brand-soft">
              {category.kategori_adi}
            </Link>
            {children.length > 0 && <CategoryBranches nodes={children} onNavigate={onNavigate} />}
          </div>)}
        </div> : <p className="py-3 text-sm text-brand-muted">Kategoriler hazırlanıyor.</p>}
    </div>
    <div className="flex justify-center border-t border-brand-line px-4 py-2">
      <Link to="/urunler" onClick={onNavigate} className="shop-btn-primary gap-2 py-2">Tüm ürünler <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
    </div>
  </section>
}
