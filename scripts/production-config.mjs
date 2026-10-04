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
}
