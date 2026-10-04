import {useEffect,useState} from 'react'
import {supabase} from '../../lib/supabase'
import toast from 'react-hot-toast'
export default function OrderDocumentDelivery({orderId}:{orderId:string}){
 const [status,setStatus]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>{let active=true;void supabase.from('order_document_deliveries').select('status').eq('order_id',orderId).maybeSingle().then(({data,error})=>{if(active)setStatus(error?'unknown':data?.status||'legacy')});return()=>{active=false}},[orderId,busy])
 async function retry(){setBusy(true);try{const {data,error}=await supabase.functions.invoke('order-document-email',{body:{orderId}});if(error||!['sent','already_sent'].includes(data?.action))throw new Error();toast.success('Belge e-postası teslim edildi.')}catch{toast.error('Teslim tamamlanamadı; posta yapılandırmasını veya sağlayıcı kaydını kontrol edin.')}finally{setBusy(false)}}
 if(!status||status==='legacy')return null
 return <section className="rounded border border-brand-line p-3 text-sm"><p>Sipariş belgesi e-postası: {{pending:'Bekliyor',sending:'Gönderiliyor',failed:'Teslim edilemedi',sent:'Teslim edildi',unknown:'Durum alınamadı'}[status]||status}</p>{status!=='sent'&&<button disabled={busy} onClick={()=>void retry()} className="shop-btn-secondary mt-2 min-h-11">{busy?'Deneniyor…':'Belge e-postasını yeniden dene'}</button>}</section>
}
