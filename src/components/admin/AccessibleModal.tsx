import { ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type AccessibleModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
  closeLabel?: string
}

export default function AccessibleModal({ open, title, onClose, children, className = 'max-w-4xl', closeLabel = `${title} penceresini kapat` }: AccessibleModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const root = document.getElementById('root')
    const previousOverflow = document.body.style.overflow
    root?.setAttribute('inert', '')
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKeyDown)
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      root?.removeAttribute('inert')
      document.body.style.overflow = previousOverflow
      openerRef.current?.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(<div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-zinc-950/40 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={`anadolu-ui my-0 min-h-[100dvh] w-full bg-brand-paper outline-none sm:my-8 sm:min-h-0 sm:rounded-lg ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-brand-line p-4 sm:p-6"><h2 className="text-xl font-semibold text-brand-ink sm:text-2xl">{title}</h2><button ref={closeRef} type="button" onClick={onClose} className="shop-icon-button" aria-label={closeLabel}><X className="h-5 w-5" aria-hidden="true" /></button></div>
      <div className="max-h-[calc(100dvh-89px)] overflow-y-auto overscroll-contain p-4 sm:max-h-[75dvh] sm:p-6">{children}</div>
    </div>
  </div>, document.body)
}
