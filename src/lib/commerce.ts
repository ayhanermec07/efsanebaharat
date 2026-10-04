export type CommerceSnapshot = {
 version: string; audience: 'b2c' | 'b2b'; currency: string; vat_included: boolean; payment_method: string
 seller: Record<string,string>; buyer: Record<string,string>
 items: {urun_adi:string;birim_turu:string;birim_adedi?:number;miktar:number;birim_fiyat:number;xml_tax_rate?:number|null}[]
 totals: {subtotal:number;discount:number;shipping_fee:number;total:number}
 documents: Record<string,string>
}
export type CheckoutReview = {review_id:string;expires_at:string;snapshot:CommerceSnapshot}
export const COMMERCE_DOCUMENT_TITLES: Record<string,string> = {
 'on-bilgilendirme':'Ön Bilgilendirme Formu','mesafeli-satis-sozlesmesi':'Mesafeli Satış Sözleşmesi',
 'teslimat-kargo':'Teslimat ve Kargo Politikası','iade-iptal-cayma':'İade / İptal / Cayma Hakkı',
 kvkk:'KVKK Aydınlatma Metni',gizlilik:'Gizlilik Politikası','islem-rehberi':'İşlem Rehberi','b2b-satis-kosullari':'Ticari Satış Koşulları',
}
export function formatOrderDocument(s:CommerceSnapshot,evidence?:{orderNumber?:string;acceptedAt?:string;hash?:string}):string {
 const money=(n:number)=>Number(n).toFixed(2)+' TRY'
 return [
  'EFSANE BAHARAT — SİPARİŞ BİLGİLENDİRMESİ',
  evidence?.orderNumber&&`Sipariş: ${evidence.orderNumber}`,evidence?.acceptedAt&&`Onay tarihi: ${evidence.acceptedAt}`,
  `Koşul sürümü: ${s.version}`,`Kapsam: ${s.audience==='b2c'?'Tüketici satışı':'Ticari satış'}`,
  'SATICI',...Object.entries(s.seller).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`),
  'ALICI / TESLİMAT',...Object.entries(s.buyer).filter(([,v])=>v).map(([k,v])=>`${k}: ${v}`),
  'ÜRÜNLER',...s.items.map(i=>`${i.urun_adi} · ${i.birim_adedi??1} ${i.birim_turu} · ${i.miktar} × ${money(i.birim_fiyat)}${i.xml_tax_rate!=null?` · KDV %${i.xml_tax_rate}`:''}`),
  `Ürünler: ${money(s.totals.subtotal)}`,`İndirim: ${money(s.totals.discount)}`,`Kargo: ${money(s.totals.shipping_fee)}`,`TOPLAM: ${money(s.totals.total)}`,s.vat_included?'Fiyatlara KDV dahildir.':'',`Ödeme: ${s.payment_method==='havale'?'Havale / EFT':'Kart'}`,
  ...Object.entries(s.documents).map(([k,v])=>`${COMMERCE_DOCUMENT_TITLES[k]||k}\n\n${v}`),
  evidence?.hash&&`Belge SHA256: ${evidence.hash}`,
 ].filter(Boolean).join('\n\n')
}
export function downloadOrderDocument(snapshot:CommerceSnapshot,evidence?:{orderNumber?:string;acceptedAt?:string;hash?:string}) {
 const url=URL.createObjectURL(new Blob(['\uFEFF'+formatOrderDocument(snapshot,evidence)],{type:'text/plain;charset=utf-8'}))
 const a=document.createElement('a');a.href=url;a.download=`siparis-${evidence?.orderNumber?.replace(/[^a-z0-9_-]/gi,'')||'bilgilendirme'}.txt`;a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000)
}
