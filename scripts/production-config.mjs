export function validateProductionConfig(env) {
  if (env.VITE_SUPABASE_URL !== 'https://api.efsanebaharat.appsgo.cloud') {
    throw new Error('Üretim VITE_SUPABASE_URL doğrulanmış self-hosted API adresiyle eşleşmeli.')
  }
  let role
  try {
    role = JSON.parse(Buffer.from(env.VITE_SUPABASE_ANON_KEY.split('.')[1], 'base64url').toString('utf8')).role
  } catch {
    // Eksik veya geçersiz anahtar aşağıdaki public anahtar kontrolünde reddedilir.
  }
  if (role !== 'anon') throw new Error('Üretim VITE_SUPABASE_ANON_KEY geçerli bir public anon anahtarı olmalı.')
  if (env.VITE_MEDIA_TRANSFORMS === 'true') {
    let media
    try { media = new URL(env.VITE_MEDIA_BASE_URL) } catch { /* validated below */ }
    if (!media || media.protocol !== 'https:' || media.username || media.password || media.port
      || media.pathname !== '/' || media.search || media.hash || media.hostname.endsWith('.r2.dev')) {
      throw new Error('Üretim görsel dönüşümü için güvenli bir özel alan adı gerekir.')
    }
  }
}
