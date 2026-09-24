import { execSync } from 'node:child_process'
import path from 'node:path'

const appRoot = path.resolve(import.meta.dirname, '..')
const supabaseRoot = path.resolve(appRoot, '..', 'supabase')

execSync('npx --yes supabase@latest db reset --sql-paths seed.sql --sql-paths seed.test.sql', {
  cwd: supabaseRoot,
  stdio: 'inherit',
})
