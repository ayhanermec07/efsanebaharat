export type PaymentMethod = 'havale' | 'paytr'
export type BankDetails = { bank_name: string; account_name: string; iban: string; account_no?: string }
export type PaymentSettings = BankDetails & { havale_enabled: boolean; paytr_enabled: boolean }
export const PAYMENT_METHOD_LABELS = { havale: 'Havale / EFT', paytr: 'Kart ile ödeme (PayTR)' }

export function validTransferDetails(settings: Partial<BankDetails>): boolean {
  const iban = settings.iban || ''
  if (!settings.bank_name?.trim() || !settings.account_name?.trim() || !/^TR\d{24}$/.test(iban)) return false
  let remainder = 0
  for (const digit of `${iban.slice(4)}2927${iban.slice(2, 4)}`) remainder = (remainder * 10 + Number(digit)) % 97
  return remainder === 1
}
export function availablePaymentMethods(settings: Partial<PaymentSettings>): PaymentMethod[] {
  const methods: PaymentMethod[] = []
  if (settings.havale_enabled && validTransferDetails(settings)) methods.push('havale')
  if (settings.paytr_enabled) methods.push('paytr')
  return methods
}
export function checkoutStorageKey(method: PaymentMethod) { return `efsane-checkout-denemesi.${method}` }
export function paymentStatusLabel(method: string, status: string): string {
  if (status === 'odendi') return 'Ödendi'
  if (status === 'onaylandi') return 'Onaylandı'
  if (status === 'fis_kontrol_bekliyor') return 'Fiş kontrolü'
  if (status === 'bekliyor') return method === 'havale' ? 'Havale bekleniyor' : 'Ödeme onayı bekleniyor'
  return status === 'reddedildi' || status === 'basarisiz' ? 'Ödeme tamamlanmadı' : status
}
