# Efsane Baharat — frontend

React, Vite ve TypeScript mağaza/yönetim uygulaması. Supabase backend'i kardeş `../supabase/` dizinindedir; Coolify yalnız frontend'i yayımlar.

Yerel çalışma alanında güncel mimari, iş kuralları, canlı ortam durumu ve açık kararlar için `../PROJE_BILGI_BANKASI.md` dosyasını okuyun. Yayın sırası ve geri alma adımları `../audit/2026-09-26/canli-yayin-runbook.md` içindedir. Bu iki belge frontend Git deposunun dışındadır. `main` dalı Coolify kaynağıdır; çalışma dalındaki değişiklikler canlıya otomatik uygulanmaz.

## Yerel geliştirme

```powershell
npm ci
npm run dev:test
```

`dev:test` yerel Supabase'i başlatır ve yalnız `127.0.0.1:4173` üzerinde Vite'ı çalıştırır. Edge Function'lar için ayrı terminalde `npm run test:functions` çalıştırın. Yeni migration varsa `../supabase/` içinden `npx --yes supabase@latest migration up --local` ile **yalnız yerel** veritabanına uygulayın. Test ortamı kontrolü: `npm run test:environment`.

Canlı Supabase'e bağlanan sırları veya service-role anahtarını tarayıcı `VITE_*` değişkenlerine koymayın. Canlı migration'ları doğrudan `db push` ile uygulamayın; canlı history kaynakla eşleşmiyor ve önce yedek/şema provası gerekiyor.

## Doğrulama

```powershell
node .\node_modules\typescript\bin\tsc -b --pretty false
node .\node_modules\eslint\bin\eslint.js .
node --test tests/*.test.mjs
npm run build
```

Görsel yükleme, sipariş ve ödeme işlemleri ayrı yerel Express sunucusundan değil, yetkili Supabase Edge Function'larından geçer.
