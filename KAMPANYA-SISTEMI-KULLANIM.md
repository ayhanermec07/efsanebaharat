# Kampanya Sistemi Kullanım Kılavuzu

## Genel Bakış

Gelişmiş kampanya sistemi, e-ticaret platformunuzda esnek ve güçlü indirim kampanyaları oluşturmanıza olanak tanır.

## Özellikler

### 1. Kampanya Türleri

- **Yüzde İndirim**: Sepet tutarının belirli bir yüzdesini indirim olarak uygular
- **Sabit Tutar İndirim**: Sepetten sabit bir tutar düşer

### 2. Hedef Grup Seçimi

- **Müşteriler**: Sadece normal müşteriler kullanabilir
- **Bayiler**: Sadece bayi hesapları kullanabilir
- **Tümü**: Tüm kullanıcılar kampanyadan yararlanabilir

### 3. Kampanya Kısıtlamaları

- **Minimum Sepet Tutarı**: Kampanyanın geçerli olması için gereken minimum tutar
- **Maksimum İndirim Tutarı**: Yüzde indirimlerde uygulanabilecek maksimum indirim
- **Kullanım Limiti**: Kampanyanın kaç kez kullanılabileceği (opsiyonel)
- **Tarih Aralığı**: Kampanyanın geçerli olduğu başlangıç ve bitiş tarihleri

## Veritabanı Yapısı

### Kampanyalar Tablosu

```sql
CREATE TABLE kampanyalar (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kod TEXT UNIQUE NOT NULL,
  ad TEXT NOT NULL,
  aciklama TEXT,
  indirim_tipi TEXT CHECK (indirim_tipi IN ('yuzde', 'tutar')),
  indirim_degeri DECIMAL(10,2) NOT NULL,
  min_sepet_tutari DECIMAL(10,2) DEFAULT 0,
  max_indirim_tutari DECIMAL(10,2),
  hedef_grup TEXT CHECK (hedef_grup IN ('musteri', 'bayi', 'tumu')),
  baslangic_tarihi TIMESTAMP NOT NULL,
  bitis_tarihi TIMESTAMP NOT NULL,
  kullanim_limiti INTEGER,
  kullanim_sayisi INTEGER DEFAULT 0,
  aktif BOOLEAN DEFAULT true,
  olusturma_tarihi TIMESTAMP DEFAULT NOW()
);
```

### Siparisler Tablosu Güncellemeleri

```sql
ALTER TABLE siparisler
ADD COLUMN kampanya_kodu TEXT,
ADD COLUMN kampanya_indirimi DECIMAL(10,2) DEFAULT 0;
```

## Kullanım Senaryoları

### Senaryo 1: Yeni Müşteri Kampanyası

```
Kod: YENIMUSTERI2024
Ad: Yeni Müşteri İndirimi
İndirim Tipi: Yüzde
İndirim Değeri: 15
Min Sepet Tutarı: 200 TL
Max İndirim: 50 TL
Hedef Grup: Müşteriler
```

**Sonuç**: 200 TL ve üzeri alışverişlerde %15 indirim, maksimum 50 TL

### Senaryo 2: Bayi Özel Kampanya

```
Kod: BAYI500
Ad: Bayi Özel İndirim
İndirim Tipi: Tutar
İndirim Değeri: 100
Min Sepet Tutarı: 500 TL
Hedef Grup: Bayiler
```

**Sonuç**: 500 TL ve üzeri alışverişlerde 100 TL sabit indirim

### Senaryo 3: Sınırlı Sayıda Kampanya

```
Kod: FLASH50
Ad: Flash İndirim
İndirim Tipi: Yüzde
İndirim Değeri: 20
Min Sepet Tutarı: 100 TL
Kullanım Limiti: 50
Hedef Grup: Tümü
```

**Sonuç**: İlk 50 kullanıcı %20 indirimden yararlanır

## Admin Panel Kullanımı

### Yeni Kampanya Oluşturma

1. Admin panelinde "Kampanyalar" menüsüne gidin
2. "Yeni Kampanya" butonuna tıklayın
3. Kampanya bilgilerini doldurun:
   - Kampanya Kodu (benzersiz, büyük harf)
   - Kampanya Adı
   - Açıklama
   - İndirim Tipi (Yüzde/Tutar)
   - İndirim Değeri
   - Minimum Sepet Tutarı
   - Maksimum İndirim (opsiyonel)
   - Hedef Grup
   - Başlangıç ve Bitiş Tarihleri
   - Kullanım Limiti (opsiyonel)
4. "Kaydet" butonuna tıklayın

### Kampanya Düzenleme

1. Kampanya listesinde düzenlemek istediğiniz kampanyayı bulun
2. "Düzenle" butonuna tıklayın
3. Gerekli değişiklikleri yapın
4. "Güncelle" butonuna tıklayın

### Kampanya Silme

1. Kampanya listesinde silmek istediğiniz kampanyayı bulun
2. "Sil" butonuna tıklayın
3. Onay mesajını kabul edin

### Kampanya İstatistikleri

İstatistikler sayfasında şunları görebilirsiniz:
- Toplam kullanım sayısı
- Toplam sipariş sayısı
- Toplam indirim tutarı
- Toplam satış tutarı
- Kampanya bazında detaylı istatistikler

## Müşteri Kullanımı

### Kampanya Kodu Uygulama

1. Sepet sayfasına gidin
2. "Kampanya Kodu" bölümünü bulun
3. Kampanya kodunu girin
4. "Uygula" butonuna tıklayın
5. İndirim otomatik olarak hesaplanır ve gösterilir

### Kampanya Kaldırma

1. Uygulanan kampanya kartında "X" butonuna tıklayın
2. Kampanya kaldırılır ve toplam tutar güncellenir

## Otomatik Kontroller

Sistem aşağıdaki kontrolleri otomatik yapar:

1. **Tarih Kontrolü**: Kampanya tarihleri içinde mi?
2. **Hedef Grup Kontrolü**: Kullanıcı kampanyayı kullanabilir mi?
3. **Minimum Tutar Kontrolü**: Sepet tutarı yeterli mi?
4. **Kullanım Limiti Kontrolü**: Kampanya kullanım limitine ulaşmış mı?
5. **Aktiflik Kontrolü**: Kampanya aktif mi?

## Trigger ve Otomasyonlar

### Kullanım Sayısı Artırma

Sipariş tamamlandığında kampanya kullanım sayısı otomatik artar:

```sql
CREATE TRIGGER trigger_kampanya_kullanim
AFTER UPDATE OF odeme_durumu ON siparisler
FOR EACH ROW
WHEN (NEW.odeme_durumu = 'tamamlandi')
EXECUTE FUNCTION kampanya_kullanim_artir();
```

## Hata Mesajları

- **"Geçersiz kampanya kodu"**: Kod bulunamadı veya aktif değil
- **"Bu kampanya henüz başlamadı"**: Başlangıç tarihi gelmedi
- **"Bu kampanya süresi dolmuş"**: Bitiş tarihi geçti
- **"Bu kampanya kullanım limitine ulaşmış"**: Maksimum kullanım sayısına ulaşıldı
- **"Bu kampanya sadece bayiler için geçerlidir"**: Bayi olmayan kullanıcı bayi kampanyası kullanmaya çalıştı
- **"Bu kampanya sadece müşteriler için geçerlidir"**: Bayi müşteri kampanyası kullanmaya çalıştı
- **"Bu kampanya için minimum sepet tutarı X TL olmalıdır"**: Sepet tutarı yetersiz

## En İyi Uygulamalar

1. **Kampanya Kodları**: Kısa, akılda kalıcı ve anlamlı kodlar kullanın
2. **Tarih Aralıkları**: Kampanya sürelerini net belirleyin
3. **Maksimum İndirim**: Yüzde indirimlerde maksimum tutar belirleyin
4. **Test Edin**: Kampanyayı yayınlamadan önce test edin
5. **İstatistikleri Takip Edin**: Kampanya performansını düzenli kontrol edin
6. **Kullanım Limiti**: Popüler kampanyalarda limit koyun
7. **Hedef Grup**: Doğru hedef grubu seçin

## Gelecek Geliştirmeler

- [ ] Kullanıcı bazlı kullanım limiti
- [ ] Ürün/kategori bazlı kampanyalar
- [ ] Otomatik kampanya aktivasyonu
- [ ] E-posta bildirimleri
- [ ] Kampanya kombinasyonları
- [ ] Sadakat puanı entegrasyonu
- [ ] A/B test desteği

## Destek

Sorun yaşarsanız:
1. Kampanya ayarlarını kontrol edin
2. Veritabanı loglarını inceleyin
3. Browser console'u kontrol edin
4. Supabase dashboard'dan kampanya verilerini doğrulayın
