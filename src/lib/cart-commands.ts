// Sepet komutlarının sonuç sözleşmesi. Başarı/başarısızlık yalnız sunucu
// cevabından türetilir; UI bu sonuca göre mesaj gösterir.

export type CartFailureReason =
  | 'auth_required'
  | 'account_inactive'
  | 'session_expired'
  | 'invalid_quantity'
  | 'minimum_not_met'
  | 'insufficient_stock'
  | 'variant_unavailable'
  | 'not_in_cart'
  | 'busy'
  | 'network'
  | 'server'

export type CartCommandResult =
  | { ok: true }
  | { ok: false; reason: CartFailureReason; message: string }

export const CART_FAILURE_MESSAGES: Record<CartFailureReason, string> = {
  auth_required: 'Sepeti kullanmak için giriş yapmalısınız',
  account_inactive: 'Hesabınız yönetici onayı bekliyor',
  session_expired: 'Oturumunuzun süresi doldu, lütfen tekrar giriş yapın',
  invalid_quantity: 'Geçersiz miktar',
  minimum_not_met: 'Minimum sipariş miktarının altında',
  insufficient_stock: 'Bu miktar için yeterli stok yok',
  variant_unavailable: 'Bu ürün seçeneği artık satışta değil',
  not_in_cart: 'Ürün sepetinizde bulunamadı; sepet yenilendi',
  busy: 'Bu ürün için önceki işlem sürüyor',
  network: 'Bağlantı hatası: işlem tamamlanamadı, tekrar deneyin',
  server: 'Sepet işlemi tamamlanamadı, tekrar deneyin',
}

export function cartFailure(reason: CartFailureReason): CartCommandResult {
  return { ok: false, reason, message: CART_FAILURE_MESSAGES[reason] }
}

type RpcErrorLike = { message?: string; code?: string; details?: string; hint?: string; status?: number } | null | undefined

export function classifyCartError(error: RpcErrorLike, online = true): CartFailureReason {
  if (!online) return 'network'
  const text = [error?.code, error?.message, error?.details, error?.hint].filter(Boolean).join(' ')
  if (/Insufficient stock/i.test(text)) return 'insufficient_stock'
  if (/Minimum quantity not met/i.test(text)) return 'minimum_not_met'
  if (/Invalid cart quantity|Piece quantity must be whole/i.test(text)) return 'invalid_quantity'
  if (/Selected stock variant is unavailable|Physical stock source missing/i.test(text)) return 'variant_unavailable'
  if (/Active customer required|Customer required/i.test(text)) return 'account_inactive'
  if (/PGRST301|PGRST302|JWT expired|invalid JWT|JWSError/i.test(text) || error?.status === 401) return 'session_expired'
  if (/Failed to fetch|NetworkError|fetch failed|Load failed|network/i.test(text)) return 'network'
  return 'server'
}

export function validateCartQuantity(quantity: number, pieceUnit: boolean, minimum = 1): CartFailureReason | null {
  if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 9999999 ||
      Math.abs(quantity * 1000 - Math.round(quantity * 1000)) > 1e-7 ||
      (pieceUnit && !Number.isInteger(quantity))) return 'invalid_quantity'
  if (quantity < minimum) return 'minimum_not_met'
  return null
}

// SQL `cart_version_for_customer` ve `paytr-payment` ile aynı kanonik sepet sürümü.
export function cartVersionCanonical(items: { stok_varyant_id: string; miktar: number | string }[]) {
  return items
    .map((item) => `${String(item.stok_varyant_id).toLowerCase()}:${String(Number(item.miktar))}`)
    .sort()
    .join('|')
}

export async function cartVersion(items: { stok_varyant_id: string; miktar: number | string }[]) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(cartVersionCanonical(items)))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Checkout denemesi: aynı sepet sürümü + kampanya için aynı anahtar yeniden
// kullanılır; sepet veya kampanya değişince yeni niyet sayılır.
export type CheckoutAttempt = { key: string; cartVersion: string; kampanyaKodu: string }

export function nextCheckoutAttempt(
  previous: CheckoutAttempt | null,
  currentCartVersion: string,
  kampanyaKodu: string,
  newKey: () => string,
): CheckoutAttempt {
  const kod = kampanyaKodu.trim().toUpperCase()
  if (previous && previous.cartVersion === currentCartVersion && previous.kampanyaKodu === kod) return previous
  return { key: newKey(), cartVersion: currentCartVersion, kampanyaKodu: kod }
}

// Bu kodlar sonrası aynı anahtar artık kullanılmaz; kullanıcı yeni deneme başlatır.
export const CHECKOUT_TERMINAL_CODES = new Set([
  'CHECKOUT_ATTEMPT_FAILED',
  'PAYMENT_PROVIDER_REJECTED',
  'IDEMPOTENCY_CONFLICT',
  'CART_VERSION_MISMATCH',
  'ORDER_ALREADY_FINALIZED',
])
