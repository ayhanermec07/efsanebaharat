import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { validTransferDetails, type PaymentSettings as Settings } from '../../lib/payment-methods'

export default function PaymentSettings() {
  const [settings, setSettings] = useState<Settings | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    void supabase.from('checkout_payment_settings').select('*').single().then(({ data, error }) => {
      if (error) toast.error('Ödeme ayarları alınamadı')
      else setSettings(data)
    })
  }, [])
  async function save() {
    if (!settings) return
    const normalized = { ...settings, iban: settings.iban.replace(/\s/g, '').toUpperCase() }
    if (normalized.havale_enabled && !validTransferDetails(normalized)) { toast.error('Banka, hesap sahibi ve geçerli bir Türkiye IBAN bilgisi gerekli'); return }
    setBusy(true)
    const { error, data } = await supabase.from('checkout_payment_settings').update({
      bank_name: normalized.bank_name.trim(), account_name: normalized.account_name.trim(), iban: normalized.iban,
      account_no: normalized.account_no?.trim() || '', havale_enabled: normalized.havale_enabled, paytr_enabled: normalized.paytr_enabled,
    }).eq('id', true).select('id').single()
    setBusy(false)
    if (error || !data) toast.error('Ödeme ayarları kaydedilemedi')
    else { setSettings(normalized); toast.success('Ödeme ayarları kaydedildi') }
  }
  if (!settings) return <p>Ödeme ayarları yükleniyor…</p>
  return <div className="max-w-xl min-w-0 space-y-4">
    <h2 className="text-lg font-bold">Ödeme yöntemleri</h2>
    <p className="text-sm text-gray-600">Havale bilgileri müşterilere gösterilir. Mevcut siparişler oluşturuldukları tarihteki hesap bilgilerini korur.</p>
    {(['bank_name', 'account_name', 'iban', 'account_no'] as const).map(key => <label key={key} className="block text-sm font-medium">
      {{ bank_name: 'Banka adı', account_name: 'Hesap sahibi', iban: 'IBAN', account_no: 'Hesap no' }[key]}
      <input value={settings[key] || ''} maxLength={key === 'iban' ? 34 : key === 'account_no' ? 40 : key === 'bank_name' ? 120 : 160} onChange={event => setSettings({ ...settings, [key]: event.target.value })} className="mt-1 block w-full min-w-0 rounded-lg border p-3" />
    </label>)}
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={settings.havale_enabled} onChange={event => setSettings({ ...settings, havale_enabled: event.target.checked })} />Havale / EFT açık</label>
    <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={settings.paytr_enabled} onChange={event => setSettings({ ...settings, paytr_enabled: event.target.checked })} />PayTR açık</label>
    <p className="text-sm text-gray-600">PayTR, mağaza anahtarları sunucuda tanımlanıp entegrasyon doğrulandıktan sonra açılmalıdır.</p>
    <button type="button" disabled={busy} onClick={() => void save()} className="shop-btn-primary disabled:opacity-50">{busy ? 'Kaydediliyor…' : 'Ödeme ayarlarını kaydet'}</button>
  </div>
}
