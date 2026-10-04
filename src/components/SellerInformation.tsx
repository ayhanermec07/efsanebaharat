import { businessInfo } from '../lib/business-info'
import {useEffect,useState} from 'react'
import {supabase} from '../lib/supabase'

export default function SellerInformation({ variant = 'legal' }: { variant?: 'contact' | 'legal' | 'footer' }) {
  const [seller,setSeller]=useState<Record<string,string>>({})
  useEffect(()=>{let active=true;void supabase.from('commerce_configuration').select('seller').eq('id',true).maybeSingle().then(({data})=>{if(active&&data)setSeller(data.seller||{})});return()=>{active=false}},[])
  return <div className="min-w-0 space-y-2 break-words text-sm leading-6" data-testid="seller-information">
    <p className="font-semibold">{seller.seller_name||businessInfo.sellerName}</p>
    <p>{seller.address||businessInfo.address}</p>
    <p>Telefon: <a href={seller.phone?`tel:${seller.phone.replace(/[^+0-9]/g,'')}`:businessInfo.phoneHref} className="inline-flex min-h-10 items-center underline underline-offset-4">{seller.phone||businessInfo.phone}</a></p>
    {variant !== 'footer' && <p>VKN: {seller.tax_number||businessInfo.taxNumber}</p>}
    {variant !== 'footer' && <p>KEP: <a href={`mailto:${seller.kep||businessInfo.kep}`} className="break-all underline underline-offset-4">{seller.kep||businessInfo.kep}</a></p>}
    {variant === 'contact' && <>
      <p>Bağlı olunan birlik: {seller.union||businessInfo.union}</p>
      {(seller.email||businessInfo.customerEmail) && <p>E-posta: <a href={`mailto:${seller.email||businessInfo.customerEmail}`} className="break-all underline underline-offset-4">{seller.email||businessInfo.customerEmail}</a></p>}
      {(seller.chamber||businessInfo.chamberName) && <p>Meslek odası: {seller.chamber||businessInfo.chamberName}</p>}
    </>}
  </div>
}
