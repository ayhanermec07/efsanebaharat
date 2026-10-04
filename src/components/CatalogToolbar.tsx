import type { ReactNode } from 'react'

export default function CatalogToolbar({ children }: { children: ReactNode }) {
  return <section aria-label="Ürün filtreleri" className="sticky top-[var(--store-header-height,0px)] z-30 border-b border-brand-line bg-brand-paper shadow-sm">
    <div className="w-full px-4 py-2 sm:px-6 lg:px-8">{children}</div>
  </section>
}
