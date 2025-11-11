# İskonto Sistemi Kullanım Kılavuzu

## Genel Bakış
İskonto sistemi, müşterilere ve bayilere özel indirimler tanımlamanızı sağlar. İskontolar ürün fiyatlarına otomatik olarak uygulanır.

## İskonto Tipleri

### 1. Tekil Müşteri
Belirli bir müşteriye özel iskonto tanımlayın.

### 2. Tekil Bayi
Belirli bir bayiye özel iskonto tanımlayın.

### 3. Müşteri Grubu
Seçtiğiniz birden fazla müşteriye aynı anda iskonto tanımlayın.

### 4. Müşteri Tipi Grubu
Tüm müşterilere veya tüm bayilere toplu iskonto tanımlayın.

## İskonto Oluşturma

1. Admin Panel > İskonto menüsüne gidin
2. "Yeni İskonto" butonuna tıklayın
3. İskonto bilgilerini doldurun:
   - İskonto Adı
   - İskonto Tipi
   - Hedef Seçimi
   - İskonto Oranı (%)
   - Başlangıç ve Bitiş Tarihi
   - Açıklama

## Ürün Sayfalarında İskonto Gösterimi

İskontolu ürünler şu şekilde gösterilir:
- Eski fiyat üstü çizili olarak gösterilir
- Yeni iskontolu fiyat vurgulanır
- İskonto oranı badge olarak gösterilir

### Örnek Kod (Ürün Kartı):

```tsx
import { iskontoUygula } from '../utils/iskonto'

// Kullanıcının iskonto oranını al (AuthContext'ten veya API'den)
const kullaniciIskontoOrani = 15 // %15

// İskonto uygula
const iskontoInfo = iskontoUygula(urun.fiyat, kullaniciIskontoOrani)

// Gösterim
{iskontoInfo.varMi ? (
  <div className="flex flex-col">
    <span className="text-gray-400 text-sm line-through">
      {iskontoInfo.eskiFiyat.toFixed(2)} ₺
    </span>
    <div className="flex items-center gap-2">
      <span className="text-orange-600 font-bold text-lg">
        {iskontoInfo.yeniFiyat.toFixed(2)} ₺
      </span>
      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
        %{iskontoInfo.oran} İndirim
      </span>
    </div>
  </div>
) : (
  <span className="text-orange-600 font-bold text-lg">
    {urun.fiyat.toFixed(2)} ₺
  </span>
)}
```

## Sepette İskonto Gösterimi

Sepet sayfasında her ürün için:
- Birim fiyat (iskontolu)
- Toplam fiyat (iskontolu)
- Sepet toplamı (tüm iskontolar uygulanmış)

### Örnek Kod (Sepet):

```tsx
// Her ürün için iskonto hesapla
const sepetUrunleri = sepet.map(item => {
  const iskontoInfo = iskontoUygula(item.fiyat, kullaniciIskontoOrani)
  return {
    ...item,
    eskiFiyat: iskontoInfo.eskiFiyat,
    yeniFiyat: iskontoInfo.yeniFiyat,
    toplamEskiFiyat: iskontoInfo.eskiFiyat * item.adet,
    toplamYeniFiyat: iskontoInfo.yeniFiyat * item.adet,
    iskontoVarMi: iskontoInfo.varMi
  }
})

// Sepet toplamı
const sepetToplami = sepetUrunleri.reduce((toplam, item) => 
  toplam + item.toplamYeniFiyat, 0
)
```

## Veritabanı Entegrasyonu

İskonto bilgilerini Supabase'den çekmek için:

```tsx
// utils/iskonto.ts dosyasındaki fonksiyonu güncelle
export async function kullaniciIskontosuKontrol(musteriId: string): Promise<number> {
  const { data, error } = await supabase
    .from('iskontolar')
    .select('iskonto_orani')
    .eq('hedef_id', musteriId)
    .eq('aktif', true)
    .lte('baslangic_tarihi', new Date().toISOString())
    .or(`bitis_tarihi.is.null,bitis_tarihi.gte.${new Date().toISOString()}`)
    .order('iskonto_orani', { ascending: false })
    .limit(1)
    .maybeSingle()
  
  if (error || !data) return 0
  return data.iskonto_orani
}
```

## AuthContext'e İskonto Ekleme

```tsx
// AuthContext.tsx
const [iskontoOrani, setIskontoOrani] = useState(0)

useEffect(() => {
  if (musteriData?.id) {
    kullaniciIskontosuKontrol(musteriData.id).then(setIskontoOrani)
  }
}, [musteriData])

// Context'e ekle
return (
  <AuthContext.Provider value={{ 
    user, 
    loading, 
    isAdmin, 
    musteriData, 
    iskontoOrani, // Yeni eklenen
    signIn, 
    signUp, 
    signOut 
  }}>
    {children}
  </AuthContext.Provider>
)
```

## Kullanım Örnekleri

### Ürün Listesi Sayfası
```tsx
const { iskontoOrani } = useAuth()

{urunler.map(urun => {
  const iskonto = iskontoUygula(urun.fiyat, iskontoOrani)
  return (
    <div key={urun.id}>
      {iskonto.varMi && (
        <span className="line-through text-gray-400">
          {iskonto.eskiFiyat} ₺
        </span>
      )}
      <span className="text-orange-600 font-bold">
        {iskonto.yeniFiyat} ₺
      </span>
    </div>
  )
})}
```

### Ürün Detay Sayfası
```tsx
const { iskontoOrani } = useAuth()
const iskonto = iskontoUygula(urun.fiyat, iskontoOrani)

<div className="price-section">
  {iskonto.varMi ? (
    <>
      <div className="flex items-center gap-3">
        <span className="text-3xl font-bold text-orange-600">
          {iskonto.yeniFiyat.toFixed(2)} ₺
        </span>
        <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
          %{iskonto.oran} İndirim
        </span>
      </div>
      <span className="text-xl text-gray-400 line-through">
        {iskonto.eskiFiyat.toFixed(2)} ₺
      </span>
      <p className="text-sm text-green-600 mt-2">
        {(iskonto.eskiFiyat - iskonto.yeniFiyat).toFixed(2)} ₺ tasarruf ediyorsunuz!
      </p>
    </>
  ) : (
    <span className="text-3xl font-bold text-orange-600">
      {urun.fiyat.toFixed(2)} ₺
    </span>
  )}
</div>
```

### Sepet Sayfası
```tsx
const { iskontoOrani } = useAuth()

const sepetToplami = sepet.reduce((toplam, item) => {
  const iskonto = iskontoUygula(item.fiyat, iskontoOrani)
  return toplam + (iskonto.yeniFiyat * item.adet)
}, 0)

const toplamIndirim = sepet.reduce((toplam, item) => {
  const iskonto = iskontoUygula(item.fiyat, iskontoOrani)
  if (iskonto.varMi) {
    return toplam + ((iskonto.eskiFiyat - iskonto.yeniFiyat) * item.adet)
  }
  return toplam
}, 0)

<div className="summary">
  <div>Ara Toplam: {sepetToplami + toplamIndirim} ₺</div>
  {toplamIndirim > 0 && (
    <div className="text-green-600">
      İndirim: -{toplamIndirim.toFixed(2)} ₺
    </div>
  )}
  <div className="font-bold text-xl">
    Toplam: {sepetToplami.toFixed(2)} ₺
  </div>
</div>
```

## Notlar

- İskonto oranları 0-100 arasında olmalıdır
- Birden fazla iskonto varsa en yüksek oran uygulanır
- Bitiş tarihi geçmiş iskontolar otomatik olarak devre dışı kalır
- İskonto bilgileri cache'lenebilir (performans için)

## Geliştirme Önerileri

1. **Cache Mekanizması**: İskonto bilgilerini localStorage'da cache'leyin
2. **Real-time Güncellemeler**: Supabase realtime ile iskonto değişikliklerini anında yansıtın
3. **Kampanya Bildirimleri**: Yeni iskontolar için kullanıcılara bildirim gösterin
4. **İskonto Geçmişi**: Kullanıcıların geçmiş iskontolarını gösterin
5. **Toplu İskonto**: Sepet toplamına göre ek iskonto uygulayın
