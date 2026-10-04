import {useState} from 'react'
import toast from 'react-hot-toast'
import {supabase} from '../lib/supabase'
import {downloadOrderDocument} from '../lib/commerce'
export default function OrderDocument({orderId,orderNumber}:{orderId:string;orderNumber:string}) {
 const [busy,setBusy]=useState(false)
 async function download(){setBusy(true);try{const {data,error}=await supabase.from('order_agreements').select('snapshot,accepted_at,content_hash').eq('order_id',orderId).maybeSingle();if(error)throw error;if(!data){toast.error('Bu eski siparişin bilgilendirme kopyası bulunmuyor.');return}downloadOrderDocument(data.snapshot,{orderNumber,acceptedAt:data.accepted_at,hash:data.content_hash})}catch{toast.error('Sipariş belgesi alınamadı. Lütfen tekrar deneyin.')}finally{setBusy(false)}}
 return <button type="button" disabled={busy} onClick={()=>void download()} className="shop-btn-secondary min-h-11 text-sm">{busy?'Belge hazırlanıyor…':'Sipariş belgelerini indir'}</button>
}
