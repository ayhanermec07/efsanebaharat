// 04.10.2026: işletme sahibinin doğruladığı bilgiler. Eksik alanlar tahmin edilmez.
export const businessInfo = {
  brand: 'Efsane Baharat',
  sellerName: 'Efsane Baharat — Ayhan Ermeç',
  owner: 'Ayhan Ermeç',
  type: 'Şahıs işletmesi / Esnaf',
  address: 'Muratpaşa Mh. 561 Sk. Özmert Apt. No: 39/B, Muratpaşa / Antalya',
  returnAddress: 'Muratpaşa Mh. 561 Sk. Özmert Apt. No: 39/B, Muratpaşa / Antalya',
  phone: '0532 054 25 20',
  phoneHref: 'tel:+905320542520',
  kep: 'ayhan.ermec@hs01.kep.tr',
  taxOffice: 'Düden Vergi Dairesi',
  taxNumber: '10045929730',
  tradesmanRegistryNumber: '287725',
  union: 'Antalya Esnaf ve Sanatkârlar Odaları Birliği',
  profession: 'Aktar ürünleri imalatı, ticareti',
  professionCode: 'D.01',
  professionStartDate: '29.12.2023',
  registryStatus: 'Aktif',
  customerEmail: null,
  returnEmail: null,
  mersisNumber: null,
  tradeRegistryNumber: null,
  foodRegistrationNumber: null,
  etbisStatus: null,
  chamberName: null,
} as const

export const missingBusinessInformation = [
  { key: 'customerEmail', label: 'Müşteri hizmetleri e-posta adresi' },
  { key: 'returnEmail', label: 'Cayma / iade başvurusu e-posta adresi' },
  { key: 'mersisNumber', label: 'MERSİS numarası (uygulanabilirliği doğrulanacak)' },
  { key: 'tradeRegistryNumber', label: 'Ticaret sicil numarası (uygulanabilirliği doğrulanacak)' },
  { key: 'foodRegistrationNumber', label: 'Gıda işletmesi kayıt numarası' },
  { key: 'etbisStatus', label: 'ETBİS kayıt durumu' },
  { key: 'chamberName', label: 'Bağlı olunan odanın doğrulanmış resmî yazımı' },
  { key: 'shippingCompany', label: 'Anlaşmalı kargo firması' },
  { key: 'dispatchTime', label: 'Normal kargoya verme / teslim süresi' },
  { key: 'shippingFee', label: 'Kargo ücreti / ücretsiz kargo koşulları' },
  { key: 'returnCarrier', label: 'İade taşıyıcısı ve iade masrafı koşulları' },
  { key: 'foodReturnExceptions', label: 'Ürün bazında gıda / hijyen cayma istisnaları' },
  { key: 'dataProcessing', label: 'Amaç bazında veri işleme hukuki sebepleri ve saklama süreleri' },
  { key: 'dataRecipients', label: 'Veri alıcıları / sağlayıcıları ve yurt dışı aktarım durumu' },
  { key: 'privacyContact', label: 'KVKK başvuru usulü ve normal başvuru e-postası' },
].map(field => ({ ...field, status: 'NEEDS INFORMATION' as const }))

export function usesConsumerCheckout(customerType: string | null | undefined): boolean {
  return customerType === 'musteri'
}
