# UV Kurulum Kılavuzu (MCP için Gerekli)

## Sorun

MCP Server çalışmıyor çünkü `uv` (Python package manager) yüklü değil.

## Çözüm

### Windows'ta Kurulum

#### Seçenek 1: Chocolatey ile (Önerilen)

```powershell
choco install uv
```

Eğer Chocolatey yüklü değilse:
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

#### Seçenek 2: Pip ile

```powershell
pip install uv
```

#### Seçenek 3: Resmi Installer

1. https://github.com/astral-sh/uv/releases adresine git
2. En son `uv-x86_64-pc-windows-msvc.msi` dosyasını indir
3. Çift tıkla ve kur

#### Seçenek 4: Scoop ile

```powershell
scoop install uv
```

### Kurulumu Doğrula

```powershell
uv --version
uvx --version
```

Her ikisi de versiyon numarası göstermeli.

## Kurulduktan Sonra

1. Kiro IDE'yi **tamamen kapat**
2. Tekrar aç
3. MCP Server otomatik olarak bağlanacak

## Sorun Devam Ederse

### PowerShell'i Yönetici Olarak Aç

1. Windows'ta PowerShell ara
2. "Yönetici olarak çalıştır" seç
3. Kurulum komutunu tekrar çalıştır

### PATH Güncelle

Kurulumdan sonra PowerShell'i yeniden başlat:

```powershell
$env:Path
```

`uv` yolunun listede olduğunu kontrol et.

### Manuel Kontrol

```powershell
# uv'nin nerede olduğunu bul
where uv

# Doğrudan çalıştır
C:\Users\Patik\AppData\Local\Programs\uv\uv.exe --version
```

## Alternatif: MCP Server Değiştir

Eğer `uv` kurmak istemezsen, başka bir MCP server kullanabilirsin:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "node",
      "args": ["path/to/supabase-mcp.js"],
      "disabled": false
    }
  }
}
```

Ama `uv` kurması daha kolay ve önerilen yol.

## Hızlı Kontrol Listesi

- [ ] `uv --version` çalışıyor
- [ ] `uvx --version` çalışıyor
- [ ] Kiro IDE yeniden başlatıldı
- [ ] MCP Server bağlı (Kiro feature panel'de kontrol et)
- [ ] Chat'te Supabase komutu test edildi
