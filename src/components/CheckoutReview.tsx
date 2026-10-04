import {COMMERCE_DOCUMENT_TITLES,downloadOrderDocument,type CheckoutReview as Review} from '../lib/commerce'
import {formatPrice} from '../lib/currency'
export default function CheckoutReview({review,accepted,onAccept}:{review:Review;accepted:boolean;onAccept:(accepted:boolean)=>void}) {
 const s=review.snapshot
 return <section aria-label="Sipariş ön bilgilendirmesi" className="my-5 min-w-0 space-y-4 border-t border-brand-line pt-5">
  <h3 className="text-lg font-bold">Siparişinizi inceleyin</h3>
  <p className="break-words text-sm">{s.buyer.name}<br/>{s.buyer.address}<br/>{s.buyer.phone}</p>
  <dl className="space-y-2 text-sm">{[['Ürünler',s.totals.subtotal],['İndirim',-s.totals.discount],['Kargo',s.totals.shipping_fee],['Ödenecek toplam',s.totals.total]].map(([label,value])=><div key={label} className="flex justify-between gap-3"><dt>{label}</dt><dd className="font-bold">{formatPrice(Number(value))}</dd></div>)}</dl>
  <p className="text-xs text-brand-muted">Fiyatlara KDV dahildir. {s.payment_method==='havale'?'Sipariş, havale/EFT ile ödeme yükümlülüğü doğurur; tahsilat banka hesabında doğrulanır.':'Sipariş ödeme yükümlülüğü doğurur.'}</p>
  {Object.entries(s.documents).map(([key,text])=><details key={key} className="min-w-0 rounded border border-brand-line p-3"><summary className="min-h-10 cursor-pointer text-sm font-semibold">{COMMERCE_DOCUMENT_TITLES[key]||key}</summary><p className="whitespace-pre-wrap break-words pt-3 text-sm leading-6">{text}</p></details>)}
  <button type="button" onClick={()=>downloadOrderDocument(s)} className="shop-btn-secondary w-full text-sm">Bilgilendirme kopyasını indir</button>
  <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0" checked={accepted} onChange={e=>onAccept(e.target.checked)}/><span>{s.audience==='b2c'?'Ön bilgilendirme formunu ve mesafeli satış sözleşmesini okuyup teyit ediyorum.':'Ticari satış koşullarını ve sipariş bilgilerini okuyup kabul ediyorum.'}</span></label>
 </section>
}
