import { supabase } from './supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const CATALOG_SORTS = [
  { value: 'onerilen', label: 'Önerilen' },
  { value: 'ad', label: 'Ada göre (A-Z)' },
  { value: 'yeni', label: 'En yeni' },
  { value: 'fiyat_artan', label: 'Fiyat: düşükten yükseğe' },
  { value: 'fiyat_azalan', label: 'Fiyat: yüksekten düşüğe' },
] as const

export type CatalogSort = (typeof CATALOG_SORTS)[number]['value']

export function isCatalogSort(value: string | null): value is CatalogSort {
  return CATALOG_SORTS.some((sort) => sort.value === value)
}

export interface CatalogStock {
  id: string
  urun_id: string
  birim_turu: string
  birim_adedi: number | null
  birim_adedi_turu: string | null
  fiyat: number
  min_siparis_miktari: number | null
  stok_birimi: string | null
}

export interface CatalogProduct {
  id: string
  urun_adi: string
  urun_kodu: string | null
  aciklama: string | null
  kategori_id: string | null
  marka_id: string | null
  ana_gorsel_url: string | null
  min_siparis_miktari: number | null
  created_at: string | null
  kategoriler: { id: string; kategori_adi: string } | null
  markalar: { id: string; marka_adi: string } | null
  urun_gorselleri: Array<{ id: string; urun_id: string; gorsel_url: string; sira_no: number | null }>
  urun_stoklari: CatalogStock[]
}

export interface CatalogCampaign {
  id: string
  ad: string | null
  baslik: string | null
  aciklama: string | null
  indirim_tipi: 'yuzde' | 'tutar'
  indirim_degeri: number
  kapsam: string
  baslangic_tarihi: string | null
  bitis_tarihi: string | null
}

export interface CatalogCategory {
  id: string
  kategori_adi: string
  ust_kategori_id: string | null
  sira_no: number | null
}

export interface CatalogBrand {
  id: string
  marka_adi: string
  logo_url: string | null
}

export interface CatalogPage {
  urunler: CatalogProduct[]
  toplam: number
  sonrakiImlec: string | null
  kampanya: CatalogCampaign | null
  kampanyaGecersiz: boolean
  fiyatGrubu: string
  kategoriler?: CatalogCategory[]
  markalar?: CatalogBrand[]
}

export interface CatalogQuery {
  q?: string
  kategori?: string
  marka?: string
  kampanya?: string
  sirala?: CatalogSort
  imlec?: string | null
  limit?: number
  meta?: boolean
}

export class CatalogError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

async function requestCatalog(query: URLSearchParams, accessToken: string | null, signal?: AbortSignal) {
  const response = await fetch(`${supabaseUrl}/functions/v1/public-catalog?${query.toString()}`, {
    headers: {
      apikey: supabaseAnonKey,
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    signal,
  })
  const body = await response.json().catch(() => null)
  return { response, body }
}

// Bayi/xml müşteri fiyatları yalnız oturum JWT'si ile istenir; sunucu aktif bayi
// ilişkisini her istekte yeniden kontrol eder. Oturum geçersizse public fiyatlara düşer.
export async function loadPublicCatalog(params: CatalogQuery = {}, signal?: AbortSignal): Promise<CatalogPage> {
  const query = new URLSearchParams()
  if (params.q?.trim()) query.set('q', params.q.trim())
  if (params.kategori) query.set('kategori', params.kategori)
  if (params.marka) query.set('marka', params.marka)
  if (params.kampanya) query.set('kampanya', params.kampanya)
  if (params.sirala) query.set('sirala', params.sirala)
  if (params.imlec) query.set('imlec', params.imlec)
  if (params.limit) query.set('limit', String(params.limit))
  if (params.meta) query.set('meta', '1')

  const { data } = await supabase.auth.getSession()
  const accessToken = data.session?.access_token || null

  let { response, body } = await requestCatalog(query, accessToken, signal)
  if (response.status === 401 && accessToken) {
    ;({ response, body } = await requestCatalog(query, null, signal))
  }

  if (!response.ok || !body?.data) {
    throw new CatalogError(body?.error?.code || 'CATALOG_UNAVAILABLE', body?.error?.message || 'Katalog verisi alınamadı')
  }
  return body.data as CatalogPage
}
