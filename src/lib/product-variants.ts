export function selectCurrentVariant<T extends { id: string; fiyat: number | string }>(variants: T[], selectedId?: string | null): T | null {
  const valid = variants.filter(variant => Number.isFinite(Number(variant.fiyat)) && Number(variant.fiyat) > 0)
  return valid.find(variant => variant.id === selectedId) || valid[0] || null
}

export function variantPopupPosition(rect: { left: number; top: number; bottom: number; width: number }, viewportWidth: number, viewportHeight: number, count: number) {
  const width = Math.min(Math.max(rect.width, 224), viewportWidth - 16)
  const desiredHeight = Math.min(count * 48 + 10, 298)
  const below = Math.max(0, viewportHeight - rect.bottom - 12)
  const above = Math.max(0, rect.top - 12)
  const upwards = below < desiredHeight && above > below
  const maxHeight = Math.min(desiredHeight, upwards ? above : below)
  return {
    left: Math.max(8, Math.min(rect.left, viewportWidth - width - 8)),
    top: upwards ? rect.top - maxHeight - 4 : rect.bottom + 4,
    width,
    maxHeight,
  }
}
