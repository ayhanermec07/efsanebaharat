import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'

function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

function isOnline() {
  return navigator.onLine
}

export default function OfflineNotice() {
  const online = useSyncExternalStore(subscribe, isOnline, () => true)
  if (online) return null

  return (
    <div role="status" className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm font-medium text-amber-950">
      <WifiOff aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span className="min-w-0 break-words">İnternet bağlantınız kesildi. Sepet ve ödeme işlemlerini bağlantı geri gelince tekrar deneyin.</span>
    </div>
  )
}
