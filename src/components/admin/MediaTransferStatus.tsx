import { useCallback, useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'

type Status = { enabled: boolean; pending: number; ready: number; failed: number; failures: { id: string; category: string }[] }

export default function MediaTransferStatus() {
  const [status, setStatus] = useState<Status | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const configured = Boolean(import.meta.env.VITE_MEDIA_BASE_URL)
  const refresh = useCallback(async () => {
    if (!configured) return
    setBusy(true)
    const { data, error } = await supabase.rpc('media_status')
    setError(error ? 'Görsel aktarım durumu alınamadı.' : '')
    if (!error) setStatus(data as Status)
    setBusy(false)
  }, [configured])
  useEffect(() => { void refresh() }, [refresh])
  if (!configured) return null
  return <section aria-label="Görsel aktarımı" className="my-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="font-semibold">Görsel aktarımı</h2>
      <button type="button" disabled={busy} onClick={() => void refresh()} className="flex min-h-10 items-center gap-2 rounded border px-3 disabled:opacity-50"><RefreshCw className="h-4 w-4" />Yenile</button>
    </div>
    {error ? <p role="alert" className="text-red-700">{error}</p> : status && <>
      <p aria-live="polite">{status.enabled ? 'Aktarım açık' : 'Aktarım kapalı'} · {status.pending} bekliyor · {status.ready} hazır · {status.failed} başarısız</p>
      {status.failures.map(item => <div key={item.id} className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t pt-2">
        <span className="min-w-0 break-words">{item.category} · {item.id.slice(0, 8)}</span>
        <button type="button" disabled={busy} className="min-h-10 rounded border px-3 disabled:opacity-50" onClick={async () => {
          setBusy(true)
          const result = await supabase.rpc('media_retry', { p_id: item.id })
          if (result.error) { setError('Aktarım yeniden başlatılamadı.'); setBusy(false) }
          else await refresh()
        }}>Yeniden dene</button>
      </div>)}
    </>}
  </section>
}
