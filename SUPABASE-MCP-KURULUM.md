# Supabase MCP Kurulum Kılavuzu

## Adım 1: Supabase Bilgilerini Bulma

### 1.1 Project URL'sini Bulun

1. [Supabase Dashboard](https://app.supabase.com) açın
2. Projenizi seçin
3. Sol menüden **Settings** > **API** tıklayın
4. **Project URL** kopyalayın
   - Örnek: `https://xxxxx.supabase.co`

### 1.2 Service Role Key'i Bulun

1. Aynı **Settings > API** sayfasında
2. **Project API keys** bölümünde
3. **Service Role** (secret) key'i kopyalayın
   - ⚠️ Bunu gizli tutun! Public key değil!
   - Başında `eyJ...` gibi uzun bir string

## Adım 2: MCP Konfigürasyonunu Güncelleme

### Workspace MCP Config

`.kiro/settings/mcp.json` dosyasını açın ve şu şekilde güncelleyin:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "uvx",
      "args": ["supabase-mcp@latest"],
      "env": {
        "SUPABASE_URL": "https://YOUR_PROJECT_ID.supabase.co",
        "SUPABASE_API_KEY": "YOUR_SERVICE_ROLE_KEY",
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false,
      "autoApprove": ["query_database", "execute_sql"]
    }
  }
}
```

### Değerleri Değiştirin

- `YOUR_PROJECT_ID` → Supabase URL'den al (xxxxx.supabase.co'daki xxxxx)
- `YOUR_SERVICE_ROLE_KEY` → Service Role Secret key'i yapıştır

**Örnek:**
```json
{
  "mcpServers": {
    "supabase": {
      "command": "uvx",
      "args": ["supabase-mcp@latest"],
      "env": {
        "SUPABASE_URL": "https://abcdef123456.supabase.co",
        "SUPABASE_API_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "FASTMCP_LOG_LEVEL": "ERROR"
      },
      "disabled": false,
      "autoApprove": ["query_database", "execute_sql"]
    }
  }
}
```

## Adım 3: MCP Server'ı Bağlama

### Seçenek 1: Kiro IDE'de Otomatik Bağlantı

1. Kiro IDE'yi yeniden başlat
2. MCP Server view'da Supabase'in bağlı olduğunu göreceksin

### Seçenek 2: Manuel Bağlantı

1. Command Palette açın (Ctrl+Shift+P)
2. "MCP" yazın
3. "Reconnect MCP Servers" seçin

## Adım 4: Test Etme

Kiro chat'te şu komutu dene:

```
Supabase'deki musteriler tablosundan ilk 5 kaydı getir
```

Veya SQL ile:

```
SELECT * FROM musteriler LIMIT 5;
```

## Supabase MCP Özellikleri

✅ SQL sorguları çalıştırma
✅ Veritabanı şemasını görüntüleme
✅ Tablo verilerini sorgulama
✅ Veri ekleme/güncelleme/silme
✅ Gerçek zamanlı veri işlemleri

## Sorun Giderme

### "Connection refused" hatası
- Supabase URL'nin doğru olduğunu kontrol et
- Service Role Key'in doğru olduğunu kontrol et
- Kiro IDE'yi yeniden başlat

### "Permission denied" hatası
- Service Role Key kullandığından emin ol (public key değil)
- Supabase RLS politikalarını kontrol et

### MCP Server bağlanmıyor
- `uv` ve `uvx` yüklü mü? Kontrol et:
  ```bash
  uv --version
  uvx --version
  ```
- Yüklü değilse: https://docs.astral.sh/uv/getting-started/installation/

## Güvenlik Notları

⚠️ **ÖNEMLİ:**
- Service Role Key'i asla public repository'ye commit etme
- `.gitignore`'a ekle veya environment variable kullan
- Sadece geliştirme ortamında kullan
- Production'da daha kısıtlı key'ler kullan

## Faydalı Komutlar

### Tüm tabloları listele
```
Supabase'deki tüm tabloları göster
```

### Belirli tablo şemasını göster
```
musteriler tablosunun şemasını göster
```

### Veri sorgula
```
SELECT * FROM urunler WHERE aktif_durum = true LIMIT 10;
```

### Veri ekle
```
INSERT INTO kategoriler (kategori_adi, aciklama) 
VALUES ('Yeni Kategori', 'Açıklama');
```
