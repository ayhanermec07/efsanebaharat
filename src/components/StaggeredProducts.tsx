import { Children, useEffect, useRef, useState, type ReactNode } from 'react'
import './staggered-products.css'

export default function StaggeredProducts({ children, className }: { children: ReactNode; className: string }) {
  const grid = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setVisible(true)
        observer.disconnect()
      }
    }, { threshold: .05 })
    if (grid.current) observer.observe(grid.current)
    return () => observer.disconnect()
  }, [])
  return <div ref={grid} className={`staggered-products ${className} ${visible ? 'is-visible' : ''}`} onAnimationEnd={event => {
    if (event.target === grid.current?.lastElementChild) setVisible(false)
  }}>
    {Children.map(children, (child, index) => <div className="min-w-0" style={{ animationDelay: `${Math.min(index, 5) * 60}ms` }}>{child}</div>)}
  </div>
}
