# İskonto Sistemi Kurulum ve Test Kılavuzu

## Kurulum Adımları

### 1. İskonto Tablosunu Güncelleme

Supabase SQL Editor'de aşağıdaki dosyayı çalıştırın:

```sql
-- update-iskonto-table.sql dosyasını çalıştırın
```

Bu işlem `hedef_tipi` kolonunu iskonto tablosuna ekler.

### 2. Test İskontosu Oluşturma

`test-iskonto-olustur.sql` dosyasını kullanarak:

1. Önce müşteri listesini görüntüleyin
2. Bir müşteri seçin ve ID'sini kopyalayın
3. Bireysel iskonto oluşturma SQL'ini uncomment edin ve çalıştırın

VEYA

1. Fiyat grubu listesini görüntüleyin
2. Bir grup seçin ve ID'sini kopyalayın
3. Grup iskontosu oluşturma SQL'ini uncomment edin ve çalıştırın

## İskonto Nasıl Çalışır?

### Öncelik Sırası

1. **Bireysel İskonto**: Müşteriye özel tanımlanan iskonto
2. **Grup İskontosu**: Müşterinin fiyat grubuna tanımlanan iskonto
3. **İskonto Yok**: Normal fiyat gösterilir

### Görüntüleme

İskontolu ürünlerde:
- ✅ Eski fiyat üstü çizili gösterilir
- ✅ Yeni fiyat büyük ve vurgulu gösterilir
- ✅ Ürün kartında "%X İndirim" etiketi görünür
- ✅ Sepete iskontolu fiyat eklenir

### Sayfalarda İskonto Gösterimi

İskonto sistemi şu sayfalarda aktiftir:
- Ana Sayfa (Öne Çıkan, En Çok Satanlar, Yeni Eklenenler)
- Ürünler Listesi
- Ürün Detay Sayfası
- Sepet (iskontolu fiyatlarla)

## Test Senaryosu

### Senaryo 1: Bireysel Müşteri İskontosu

1. Supabase'de bir müşteri için %15 iskonto oluşturun
2. O müşteri ile giriş yapın
3. Ürünlere gidin ve fiyatları kontrol edin
4. Eski fiyat üstü çizili, yeni fiyat %15 indirimli görünmeli

### Senaryo 2: Grup İskontosu

1. "Bireysel Müşteri" fiyat grubu için %10 iskonto oluşturun
2. Bu gruptaki herhangi bir müşteri ile giriş yapın
3. Tüm ürünlerde %10 indirim görünmeli

### Senaryo 3: Öncelik Testi

1. Bir müşteriye %20 bireysel iskonto tanımlayın
2. Aynı müşterinin grubuna %10 iskonto tanımlayın
3. Müşteri giriş yaptığında %20 iskonto görünmeli (bireysel öncelikli)

## Sorun Giderme

### İskonto Görünmüyor

1. Supabase'de iskontonun `aktif = true` olduğunu kontrol edin
2. Başlangıç ve bitiş tarihlerini kontrol edin
3. `hedef_tipi` kolonunun doğru değerde olduğunu kontrol edin
4. RLS politikalarının doğru çalıştığını kontrol edin

### Yanlış İskonto Oranı

1. Birden fazla iskonto tanımlı olabilir, en yüksek oran uygulanır
2. Bireysel iskonto her zaman grup iskontosundan önceliklidir

### Sepette Farklı Fiyat

1. Sepete eklerken iskonto uygulanır
2. Sepet içeriğini temizleyip tekrar ekleyin
3. Tarayıcı önbelleğini temizleyin

## Teknik Detaylar

### AuthContext İskonto Hesaplama

```typescript
// Kullanıcı giriş yaptığında iskonto oranı otomatik hesaplanır
const { iskontoOrani } = useAuth()
```

### İskonto Uygulama Fonksiyonu

```typescript
import { iskontoUygula } from '../utils/iskonto'

const iskontoInfo = iskontoUygula(fiyat, iskontoOrani)
// iskontoInfo.varMi - İskonto var mı?
// iskontoInfo.oran - İskonto oranı
// iskontoInfo.yeniFiyat - İndirimli fiyat
// iskontoInfo.eskiFiyat - Orijinal fiyat
```

## Admin Panel Kullanımı

Admin panelden iskonto yönetimi için:

1. Admin Panel > İskonto menüsüne gidin
2. Mevcut iskontaları görüntüleyin
3. Yeni iskonto ekleyin veya mevcut iskontaları düzenleyin
4. İskontaları aktif/pasif yapın

## Önemli Notlar

- İskontolar sadece giriş yapmış kullanıcılara gösterilir
- Misafir kullanıcılar normal fiyatları görür
- İskonto tarihi geçmiş iskontolar otomatik olarak uygulanmaz
- Bir müşteriye birden fazla iskonto tanımlanabilir, en yüksek oran uygulanır
