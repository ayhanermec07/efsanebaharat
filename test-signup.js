import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlZmF1bHQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY5NjYwMzMzOCwiZXhwIjoxOTkyMzAzMzM4fQ.zFvU3o_N5_Wb9_Vf_X_Y_Z_A_B_C_D_E'

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  const email = 'test' + Date.now() + '@example.com'
  console.log('Signing up with', email)
  const { data, error } = await supabase.auth.signUp({
    email,
    password: 'password123',
    options: {
      data: {
        ad: 'Test',
        soyad: 'User',
        telefon: '1234567890'
      }
    }
  })
  console.log('Data:', data)
  console.log('Error:', error)
}
run()
