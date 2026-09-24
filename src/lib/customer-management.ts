export type CustomerUpdateInput = {
  fiyat_grubu_id: string | null
  musteri_tipi: string
  ozel_iskonto_orani: number | string
  aktif_durum: boolean
}

export type CustomerUpdate = {
  fiyat_grubu_id: string | null
  musteri_tipi: 'musteri' | 'bayi' | 'xml_musteri'
  ozel_iskonto_orani: number
  aktif_durum: boolean
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const customerTypes = new Set<CustomerUpdate['musteri_tipi']>(['musteri', 'bayi', 'xml_musteri'])

export function validateCustomerUpdate(input: CustomerUpdateInput): { data?: CustomerUpdate; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  const fiyatGrubuId = input.fiyat_grubu_id?.trim() || null
  const iskonto = typeof input.ozel_iskonto_orani === 'number'
    ? input.ozel_iskonto_orani
    : Number(input.ozel_iskonto_orani.trim().replace(',', '.'))

  if (fiyatGrubuId && !uuidPattern.test(fiyatGrubuId)) {
    errors.fiyat_grubu_id = 'Geçerli bir iskonto grubu seçin.'
  }

  if (!customerTypes.has(input.musteri_tipi as CustomerUpdate['musteri_tipi'])) {
    errors.musteri_tipi = 'Geçerli bir müşteri tipi seçin.'
  }

  if (!Number.isFinite(iskonto) || iskonto < 0 || iskonto > 100) {
    errors.ozel_iskonto_orani = 'Ek iskonto 0 ile 100 arasında olmalıdır.'
  }

  if (Object.keys(errors).length > 0) return { errors }

  return {
    data: {
      fiyat_grubu_id: fiyatGrubuId,
      musteri_tipi: input.musteri_tipi as CustomerUpdate['musteri_tipi'],
      ozel_iskonto_orani: iskonto,
      aktif_durum: Boolean(input.aktif_durum)
    },
    errors: {}
  }
}
