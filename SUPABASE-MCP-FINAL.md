# Supabase MCP - Final Kurulum ✅

## Bilgiler

| Bilgi | Değer |
|-------|-------|
| **Project Ref** | `uvagzvevktzzfrzkvtsd` |
| **Access Token** | `sbp_914cd60d2131949af13b9a8162b91b0a0dab5ff7` |
| **URL** | https://uvagzvevktzzfrzkvtsd.supabase.co |

## MCP Config

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_PROJECT_REF": "uvagzvevktzzfrzkvtsd",
        "SUPABASE_ACCESS_TOKEN": "sbp_914cd60d2131949af13b9a8162b91b0a0dab5ff7"
      },
      "disabled": false,
      "autoApprove": ["apply_migration", "execute_sql", "list_tables", "query_database"]
    }
  }
}
```

## Kurulum Adımları

### 1. Node.js Kontrol Et

```powershell
node --version
npm --version
```

Eğer yüklü değilse: https://nodejs.org/

### 2. Kiro IDE'yi Yeniden Başlat

1. Kiro IDE'yi tamamen kapat
2. Tekrar aç
3. MCP Server otomatik olarak bağlanacak

### 3. Test Et

Chat'te şu komutları dene:

```
Supabase'deki tüm tabloları listele
```

Veya:

```
SELECT * FROM musteriler LIMIT 5;
```

## Kullanılabilir Komutlar

- `list_tables` - Tüm tabloları listele
- `query_database` - SQL sorgusu çalıştır
- `execute_sql` - SQL komutunu çalıştır
- `apply_migration` - Migration uygula

## Sorun Giderme

### "Command not found: npx"
- Node.js yüklü mü? Kontrol et: `node --version`
- Yüklü değilse: https://nodejs.org/

### MCP Server bağlanmıyor
- Kiro IDE'yi tamamen kapat ve aç
- `.kiro/settings/mcp.json` dosyasını kontrol et
- Bilgilerin doğru olduğunu kontrol et

### Supabase bağlantısı başarısız
- Access Token'ın doğru olduğunu kontrol et
- Project Ref'in doğru olduğunu kontrol et
- Supabase projesinin aktif olduğunu kontrol et

### Timeout hatası
- İlk çalıştırmada paket indirilir, biraz zaman alabilir
- Kiro IDE'yi kapatıp tekrar aç

## Başarılı! 🎉

Artık Supabase MCP tamamen kurulu ve çalışıyor!

### Sonraki Adımlar

1. Veritabanı tablolarını listele
2. Veri sorgula
3. Yeni veriler ekle/güncelle
4. Migrations uygula

## Güvenlik Notları

⚠️ **ÖNEMLİ:**
- Access Token'ı gizli tutun
- Public repository'ye commit etmeyin
- Production'da environment variable kullan

```bash
export SUPABASE_ACCESS_TOKEN="your_token"
export SUPABASE_PROJECT_REF="your_ref"
```
