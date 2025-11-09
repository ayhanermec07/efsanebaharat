import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uvagzvevktzzfrzkvtsd.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2YWd6dmV2a3R6emZyemt2dHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzA1NDMsImV4cCI6MjA3Nzg0NjU0M30.ENrSW4rJmbwEWi6eSynCuXv8CdC9JroK-fpiIiVYwP0'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
