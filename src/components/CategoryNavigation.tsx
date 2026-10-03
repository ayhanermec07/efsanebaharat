import { ChevronDown } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { CategoryNode } from '../lib/category-hierarchy'

export default function CategoryNavigation({ nodes, onNavigate }: { nodes: CategoryNode[]; onNavigate: () => void }) {
  return <ul className="min-w-0 space-y-1">
    {nodes.map(({ category, children }) => <li key={category.id} className="min-w-0">
      {children.length ? <details className="min-w-0 [&[open]>summary>svg]:rotate-180">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-md px-2 py-2 text-sm font-semibold text-brand-ink hover:bg-brand-soft [&::-webkit-details-marker]:hidden">
          <span className="min-w-0 break-words">{category.kategori_adi}</span>
          <ChevronDown className="h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <div className="ml-2 min-w-0 border-l border-brand-line pl-2">
          <Link to={`/urunler?kategori=${category.id}`} onClick={onNavigate} className="block min-h-11 break-words rounded-md px-2 py-3 text-sm font-semibold text-emerald-800 hover:bg-brand-soft">
            Tüm {category.kategori_adi} ürünleri
          </Link>
          <CategoryNavigation nodes={children} onNavigate={onNavigate} />
        </div>
      </details> : <Link to={`/urunler?kategori=${category.id}`} onClick={onNavigate} className="block min-h-11 break-words rounded-md px-2 py-3 text-sm text-brand-ink hover:bg-brand-soft">
        {category.kategori_adi}
      </Link>}
    </li>)}
  </ul>
}
