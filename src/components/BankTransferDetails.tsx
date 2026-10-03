import type { BankDetails } from '../lib/payment-methods'

export default function BankTransferDetails({ details, reference }: { details: BankDetails; reference?: string }) {
  return <div className="min-w-0 rounded-lg border border-amber-200 bg-amber-50 p-4 text-left text-sm text-zinc-800">
    <p className="mb-3 font-bold">Havale / EFT hesap bilgileri</p>
    <dl className="space-y-2 break-words">
      <div><dt className="text-zinc-500">Banka</dt><dd>{details.bank_name}</dd></div>
      <div><dt className="text-zinc-500">Hesap sahibi</dt><dd>{details.account_name}</dd></div>
      <div><dt className="text-zinc-500">IBAN</dt><dd className="select-all font-mono break-all">{details.iban}</dd></div>
      {details.account_no && <div><dt className="text-zinc-500">Hesap no</dt><dd>{details.account_no}</dd></div>}
      {reference && <div><dt className="text-zinc-500">Transfer açıklaması</dt><dd className="select-all font-bold">{reference}</dd></div>}
    </dl>
    <p className="mt-3 leading-6">{reference ? 'Açıklamaya sipariş numaranızı yazın. ' : ''}Ödemeniz hesabımıza ulaşıp onaylandıktan sonra siparişiniz hazırlanır.</p>
  </div>
}
