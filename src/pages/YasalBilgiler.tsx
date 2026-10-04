import { Link, useLocation } from 'react-router-dom'
import SellerInformation from '../components/SellerInformation'
import { legalDocuments } from '../lib/legal-documents'
import Bulunamadi from './Bulunamadi'
import {useEffect,useState} from 'react'
import {supabase} from '../lib/supabase'

export default function YasalBilgiler() {
  const { pathname } = useLocation()
  const document = legalDocuments.find(item => item.path === pathname)
  const [published,setPublished]=useState<Record<string,string>>({})
  useEffect(()=>{let active=true;void supabase.from('commerce_configuration').select('consumer_ready,documents').eq('id',true).maybeSingle().then(({data})=>{if(active)setPublished(data?.consumer_ready?data.documents:{})});return()=>{active=false}},[])
  if (!document) return <Bulunamadi />
  const finalText=published[pathname.slice(1)]
  if(finalText)return <div className="shop-container py-8 sm:py-12"><article className="mx-auto min-w-0 max-w-3xl space-y-6"><h1 className="break-words text-3xl sm:text-4xl">{document.title}</h1><SellerInformation/><p className="whitespace-pre-wrap break-words text-sm leading-7">{finalText}</p></article></div>
  return <div className="shop-container py-8 sm:py-12">
    <article className="mx-auto min-w-0 max-w-3xl space-y-8">
      <header><p className="shop-eyebrow">İşletme ve yasal bilgiler</p><h1 className="mt-3 break-words text-3xl sm:text-4xl">{document.title}</h1><p className="mt-3 text-sm text-brand-muted">4 Ekim 2026 · Çalışma taslağı</p></header>
      <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
        <p className="font-semibold">Çalışma taslağı — Metin henüz tamamlanmadı.</p>
        <p>Doğrulanmış satıcı bilgileri kullanılmıştır. Eksik koşullar tamamlanana kadar bu sayfa nihai sözleşme veya sipariş onayı yerine geçmez.</p>
      </div>
      {document.audience === 'b2c' && <p data-testid="consumer-scope" className="text-sm leading-6 text-brand-muted">B2C tüketici alışverişi içindir. Bayi / B2B ve XML müşteri işlemlerine otomatik uygulanmaz.</p>}
      <section aria-label="Satıcı bilgileri"><h2 className="mb-4 text-xl">Satıcı bilgileri</h2><SellerInformation /></section>
      {document.sections.map(section => <section key={section.heading} className="space-y-3"><h2 className="text-xl">{section.heading}</h2>{section.paragraphs.map(paragraph => <p key={paragraph} className="break-words text-sm leading-7 text-brand-muted">{paragraph}</p>)}</section>)}
      {document.sources && <section><h2 className="mb-3 text-xl">Resmî kaynaklar</h2><ul className="space-y-2">{document.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">{source.title}</a></li>)}</ul></section>}
      <nav aria-label="Yasal sayfalar" className="flex flex-wrap gap-x-5 gap-y-2 border-t border-brand-line pt-5">{legalDocuments.filter(item => item.path !== pathname).map(item => <Link key={item.path} to={item.path} className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">{item.title}</Link>)}</nav>
    </article>
  </div>
}
