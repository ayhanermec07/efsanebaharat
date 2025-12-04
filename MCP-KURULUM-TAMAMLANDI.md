# Supabase MCP Kurulum Tamamlandı ✅

## Yapılan İşlemler

✅ `uv` (Python package manager) kuruldu
✅ Supabase Python client kuruldu
✅ Özel MCP server oluşturuldu (`supabase_mcp_server.py`)
✅ MCP config güncellendi (`.kiro/settings/mcp.json`)

## Supabase Bilgileri

- **URL**: https://uvagzvevktzzfrzkvtsd.supabase.co
- **API Key**: Konfigüre edildi
- **Status**: Hazır ✅

## Sonraki Adımlar

### 1. Kiro IDE'yi Yeniden Başlat

1. Kiro IDE'yi tamamen kapat
2. Tekrar aç
3. MCP Server otomatik olarak bağlanacak

### 2. Test Et

Chat'te şu komutları dene:

```
Supabase'deki musteriler tablosundan ilk 5 kaydı getir
```

Veya doğrudan SQL:

```
SELECT * FROM musteriler LIMIT 5;
```

## Dosyalar

- `.kiro/settings/mcp.json` - MCP konfigürasyonu
- `supabase_mcp_server.py` - Özel MCP server

## Sorun Giderme

### MCP Server bağlanmıyor
- Kiro IDE'yi tamamen kapat ve aç
- Tarayıcı konsolunu kontrol et (F12)
- `supabase_mcp_server.py` dosyasının workspace root'ta olduğunu kontrol et

### Supabase bağlantısı başarısız
- URL ve API Key'in doğru olduğunu kontrol et
- Supabase projesinin aktif olduğunu kontrol et
- İnternet bağlantısını kontrol et

### Python modülü bulunamıyor
```bash
pip install supabase
```

## Kullanılabilir Komutlar

- `SELECT * FROM tablo_adi;` - Veri sorgula
- `INSERT INTO tablo_adi (...) VALUES (...);` - Veri ekle
- `UPDATE tablo_adi SET ... WHERE ...;` - Veri güncelle
- `DELETE FROM tablo_adi WHERE ...;` - Veri sil

## Güvenlik

⚠️ API Key bu dosyada saklanıyor. Production'da environment variable kullan!

```bash
# Environment variable ile
export SUPABASE_API_KEY="your_key_here"
```

## Başarılı! 🎉

Artık Kiro'dan doğrudan Supabase'e erişebilirsin!
