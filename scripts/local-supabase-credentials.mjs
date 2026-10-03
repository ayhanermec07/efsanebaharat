import { execSync } from 'node:child_process'
import path from 'node:path'

const supabaseRoot = path.resolve(import.meta.dirname, '../../supabase')

export function parseLocalSupabaseStatus(output) {
  const values = Object.fromEntries(String(output).split(/\r?\n/)
    .map((line) => line.match(/^([A-Z_]+)=(?:"(.*)"|(.*))$/))
    .filter(Boolean)
    .map((match) => [match[1], match[2] ?? match[3]]))

  if (values.API_URL !== 'http://127.0.0.1:54321') {
    throw new Error('Testler yalnız yerel Supabase API adresini kullanabilir.')
  }
  if (!values.ANON_KEY || !values.SERVICE_ROLE_KEY) {
    throw new Error('Yerel Supabase anonim veya service-role anahtarı eksik.')
  }
  return { url: values.API_URL, anonKey: values.ANON_KEY, serviceRoleKey: values.SERVICE_ROLE_KEY }
}

export function getLocalSupabaseCredentials() {
  const output = execSync('npx --yes supabase@latest status -o env', {
    cwd: supabaseRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
    timeout: 120_000,
  })
  return parseLocalSupabaseStatus(output)
}
