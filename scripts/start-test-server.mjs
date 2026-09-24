import { execSync, spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'

const appRoot = path.resolve(import.meta.dirname, '..')
const supabaseRoot = path.resolve(appRoot, '..', 'supabase')

execSync('npx --yes supabase@latest start', {
    cwd: supabaseRoot,
    stdio: 'ignore',
  })

const runtimeEnvPath = path.join(
  supabaseRoot,
  '.temp',
  'start-secrets',
  'supabase_edge_runtime_Efsane_Baharat',
  'env',
  'docker.env',
)
if (!fs.existsSync(runtimeEnvPath)) {
  throw new Error('Yerel Supabase çalışma bilgisi bulunamadı. Önce test veritabanını başlatın.')
}
const runtimeValues = Object.fromEntries(
  fs.readFileSync(runtimeEnvPath, 'utf8').split(/\r?\n/)
    .filter((line) => line.includes('='))
    .map((line) => {
      const index = line.indexOf('=')
      return [line.slice(0, index), line.slice(index + 1)]
    }),
)

const localApiUrl = 'http://127.0.0.1:54321'

if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?(\/|$)/.test(localApiUrl || '')) {
  throw new Error('Güvenlik engeli: dev:test yalnızca yerel Supabase ile çalışabilir.')
}
const localAnonKey = runtimeValues.SUPABASE_ANON_KEY

if (!localAnonKey) {
  throw new Error('Yerel Supabase anonim anahtarı bulunamadı.')
}

const command = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const child = spawn(command, ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173'], {
  cwd: appRoot,
  env: {
    ...process.env,
    VITE_SUPABASE_URL: localApiUrl,
    VITE_SUPABASE_ANON_KEY: localAnonKey,
  },
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('exit', (code) => process.exit(code ?? 1))
