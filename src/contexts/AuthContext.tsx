import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  musteriData: any | null
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, userData: any) => Promise<any>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [musteriData, setMusteriData] = useState<any | null>(null)

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          // Admin kontrolü
          const { data: adminData } = await supabase
            .from('admin_users')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
          
          setIsAdmin(!!adminData)
          
          // Müşteri bilgilerini al
          const { data: musteri, error: musteriError } = await supabase
            .from('musteriler')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle()
          
          if (musteriError) {
            console.error('Müşteri bilgisi yükleme hatası:', musteriError)
          }
          
          // Fiyat grubu bilgisini ayrı çek
          if (musteri && musteri.fiyat_grubu_id) {
            const { data: fiyatGrubu } = await supabase
              .from('fiyat_gruplari')
              .select('*')
              .eq('id', musteri.fiyat_grubu_id)
              .maybeSingle()
            
            setMusteriData({ ...musteri, fiyat_gruplari: fiyatGrubu })
          } else {
            setMusteriData(musteri)
          }
        }
      } finally {
        setLoading(false)
      }
    }
    
    loadUser()

    // Auth state değişikliklerini dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user || null)
        if (!session?.user) {
          setIsAdmin(false)
          setMusteriData(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string) {
    const result = await supabase.auth.signInWithPassword({ email, password })
    
    if (result.data.user) {
      // Admin kontrolü
      const { data: adminData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('user_id', result.data.user.id)
        .maybeSingle()
      
      setIsAdmin(!!adminData)
      
      // Müşteri bilgilerini al
      const { data: musteri, error: musteriError } = await supabase
        .from('musteriler')
        .select('*')
        .eq('user_id', result.data.user.id)
        .maybeSingle()
      
      if (musteriError) {
        console.error('Müşteri bilgisi yükleme hatası:', musteriError)
      }
      
      // Fiyat grubu bilgisini ayrı çek
      if (musteri && musteri.fiyat_grubu_id) {
        const { data: fiyatGrubu } = await supabase
          .from('fiyat_gruplari')
          .select('*')
          .eq('id', musteri.fiyat_grubu_id)
          .maybeSingle()
        
        setMusteriData({ ...musteri, fiyat_gruplari: fiyatGrubu })
      } else {
        setMusteriData(musteri)
      }
    }
    
    return result
  }

  async function signUp(email: string, password: string, userData: any) {
    const result = await supabase.auth.signUp({ 
      email, 
      password 
    })
    
    if (result.data.user) {
      // Müşteri kaydı oluştur
      const { data: defaultFiyatGrubu } = await supabase
        .from('fiyat_gruplari')
        .select('id')
        .eq('grup_adi', 'Bireysel Müşteri')
        .maybeSingle()
      
      await supabase.from('musteriler').insert({
        user_id: result.data.user.id,
        ad: userData.ad,
        soyad: userData.soyad,
        telefon: userData.telefon || '',
        adres: userData.adres || '',
        fiyat_grubu_id: defaultFiyatGrubu?.id,
        musteri_tipi: userData.musteri_tipi || 'musteri',
        aktif_durum: true
      })
    }
    
    return result
  }

  async function signOut() {
    await supabase.auth.signOut()
    setIsAdmin(false)
    setMusteriData(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, musteriData, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
