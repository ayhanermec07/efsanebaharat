import { ReactNode, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

type AccessibleModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export default function AccessibleModal({ open, title, onClose, children, className = 'max-w-4xl' }: AccessibleModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
      if (event.key !== 'Tab') return
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    const root = document.getElementById('root')
    root?.setAttribute('inert', '')
    document.addEventListener('keydown', onKeyDown)
    window.setTimeout(() => dialogRef.current?.focus(), 0)
    return () => { document.removeEventListener('keydown', onKeyDown); root?.removeAttribute('inert'); openerRef.current?.focus() }
  }, [onClose, open])

  if (!open) return null
  return createPortal(<div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} className={`my-0 min-h-screen w-full bg-white outline-none sm:my-8 sm:min-h-0 sm:rounded-lg ${className}`}>
      <div className="flex items-center justify-between border-b p-4 sm:p-6"><h2 className="text-xl font-bold text-gray-900 sm:text-2xl">{title}</h2><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center rounded-lg text-gray-500 hover:bg-gray-100" aria-label={`${title} penceresini kapat`}><X className="h-5 w-5" /></button></div>
      <div className="max-h-[calc(100vh-73px)] overflow-y-auto p-4 sm:max-h-[80vh] sm:p-6">{children}</div>
    </div>
  </div>, document.body)
}
