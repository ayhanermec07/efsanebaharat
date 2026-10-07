export interface HomeCampaign {
  id: string
  ad: string | null
  banner_gorseli: string | null
  kapsam: string
  kategori_id?: string | null
  marka_id?: string | null
}

export interface CampaignArtwork {
  id: string
  kampanya_id: string
  gorsel_url: string | null
  baslik: string | null
}

export interface CampaignSlide {
  id: string
  title: string
  image: string
  href: string
}

// Only the already eligible parent campaigns can publish child banner artwork.
export function homeCampaignSlides(campaigns: HomeCampaign[], artwork: CampaignArtwork[]): CampaignSlide[] {
  return campaigns.flatMap(campaign => {
    const params = new URLSearchParams()
    if (campaign.kapsam === 'kategori' && campaign.kategori_id) params.set('kategori', campaign.kategori_id)
    if (campaign.kapsam === 'marka' && campaign.marka_id) params.set('marka', campaign.marka_id)
    params.set('kampanya', campaign.id)
    const href = `/urunler?${params}`
    const banners = artwork.filter(banner => banner.kampanya_id === campaign.id && banner.gorsel_url?.trim())
    if (banners.length) return banners.map(banner => ({ id: `banner:${banner.id}`, title: banner.baslik?.trim() || campaign.ad || 'Kampanya', image: banner.gorsel_url!.trim(), href }))
    return campaign.banner_gorseli?.trim() ? [{ id: `campaign:${campaign.id}`, title: campaign.ad || 'Kampanya', image: campaign.banner_gorseli.trim(), href }] : []
  })
}

// Yönetici mağaza önizlemesi normal müşteri kampanyalarını kullanır.
export function homeCampaignAudience(customerType?: string | null): 'bayi' | 'musteri' {
  return customerType === 'bayi' ? 'bayi' : 'musteri'
}
