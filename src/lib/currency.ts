const tryFormatter = new Intl.NumberFormat('tr-TR', {
  style: 'currency',
  currency: 'TRY',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatPrice(value: number | null | undefined): string {
  return value == null || !Number.isFinite(value) ? '—' : tryFormatter.format(value)
}
