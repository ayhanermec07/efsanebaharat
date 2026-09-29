import { execSync, spawn } from 'node:child_process'
import path from 'node:path'
import { getLocalSupabaseCredentials } from './local-supabase-credentials.mjs'

const appRoot = path.resolve(import.meta.dirname, '..')
const supabaseRoot = path.resolve(appRoot, '..', 'supabase')

execSync('npx --yes supabase@latest start', {
    cwd: supabaseRoot,
    stdio: 'ignore',
  })

const { url: localApiUrl, anonKey: localAnonKey } = getLocalSupabaseCredentials()

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
