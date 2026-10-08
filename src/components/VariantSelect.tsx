import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import { variantPopupPosition } from '../lib/product-variants'
import { formatPrice } from '../lib/currency'

interface VariantOption { id: string; label: string; price: number }
interface VariantSelectProps {
  options: VariantOption[]
  selectedId: string
  onChange: (id: string) => void
  disabled?: boolean
}

export default function VariantSelect({ options, selectedId, onChange, disabled }: VariantSelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [position, setPosition] = useState<ReturnType<typeof variantPopupPosition> | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const popup = useRef<HTMLDivElement>(null)
  const id = useId()
  const selected = options.find(option => option.id === selectedId) || options[0]
  const close = (restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) trigger.current?.focus()
  }
  const show = () => {
    if (disabled) return
    setActiveIndex(Math.max(0, options.findIndex(option => option.id === selectedId)))
    setOpen(true)
  }

  useLayoutEffect(() => {
    if (!open || !trigger.current) return
    const update = () => {
      if (!trigger.current) return
      setPosition(variantPopupPosition(trigger.current.getBoundingClientRect(), window.innerWidth, window.innerHeight, options.length))
    }
    update()
    window.addEventListener('resize', update)
    const scroll = (event: Event) => {
      if (!popup.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('scroll', scroll, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', scroll, true)
    }
  }, [open, options.length])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
  }, [open])

  useLayoutEffect(() => {
    if (!open || !position) return
    const option = popup.current?.querySelectorAll<HTMLButtonElement>('[role="option"]')[Math.min(activeIndex, options.length - 1)]
    option?.focus({ preventScroll: true })
    option?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex, open, position, options.length])

  if (!selected) return <div className="product-variant-static">Stok seçiniz</div>

  const label = <><span className="product-variant-label">{selected.label}</span><span className="product-variant-price">{formatPrice(selected.price)}</span></>
  if (options.length === 1) return <div className="product-variant-static">{label}</div>

  return <>
    <button ref={trigger} type="button" className="product-variant-trigger" disabled={disabled}
      aria-label={`Paket seçimi: ${selected.label}, ${formatPrice(selected.price)}`}
      aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? id : undefined}
      onClick={() => open ? close() : show()}
      onKeyDown={event => {
        if (['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); show() }
      }}>
      {label}<ChevronDown className="product-variant-chevron" size={14} aria-hidden="true" />
    </button>
    {open && position && createPortal(
      <div ref={popup} id={id} role="listbox" aria-label="Paket seçimi" className="product-variant-popup" style={{ ...position, position: 'fixed' }}
        onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); close(true) }
          else if (event.key === 'Tab') close(true)
          else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
            event.preventDefault()
            setActiveIndex(index => event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length)
          }
        }}>
        {options.map((option, index) => <button key={option.id} type="button" role="option" aria-selected={option.id === selectedId}
          tabIndex={index === activeIndex ? 0 : -1} className="product-variant-option"
          onClick={() => { onChange(option.id); close(true) }}>
          <span className="product-variant-label">{option.label}</span>
          <span className="product-variant-price">{formatPrice(option.price)}</span>
          <Check size={15} className={option.id === selectedId ? '' : 'invisible'} aria-hidden="true" />
        </button>)}
      </div>, document.body)}
  </>
}
