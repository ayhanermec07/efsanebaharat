type DealerSale = {
  satis_tarihi: string
  siparis_id: string
  urun_adedi: number
  toplam_tutar: number
  bayi?: { bayii_kodu: string; bayi_adi: string }
}

const money = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function cell(value: unknown): string {
  let text = String(value ?? '')
  if (/^\s*[=+\-@]/u.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function dealerSalesCsv(rows: DealerSale[]): string {
  const data = [
    ['Tarih', 'Bayi Kodu', 'Bayi Adı', 'Sipariş ID', 'Ürün Adedi', 'Toplam Tutar'],
    ...rows.map(sale => [
      new Date(sale.satis_tarihi).toLocaleDateString('tr-TR', { timeZone: 'Europe/Istanbul' }),
      sale.bayi?.bayii_kodu || '-',
      sale.bayi?.bayi_adi || '-',
      sale.siparis_id,
      sale.urun_adedi,
      money.format(sale.toplam_tutar)
    ])
  ]
  return '\uFEFF' + data.map(row => row.map(cell).join(';')).join('\r\n') + '\r\n'
}
