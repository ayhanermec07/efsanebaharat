import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  isAdmin: boolean
  musteriData: any | null
  iskontoOrani: number
  grupIskontoOrani: number
  ozelIskontoOrani: number
  signIn: (email: string, password: string) => Promise<any>
  signUp: (email: string, password: string, userData: any) => Promise<any>
  signOut: () => Promise<void>
  updateUser: (data: { ad?: string; soyad?: string; telefon?: string; adres?: string }) => Promise<any>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [musteriData, setMusteriData] = useState<any | null>(null)
  const [iskontoOrani, setIskontoOrani] = useState(0)
  const [grupIskontoOrani, setGrupIskontoOrani] = useState(0)
  const [ozelIskontoOrani, setOzelIskontoOrani] = useState(0)

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

          // İskonto oranını hesapla
          if (musteri) {
            await hesaplaIskontoOrani(musteri.id)
          }
        } else {
          setIskontoOrani(0)
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

  async function hesaplaIskontoOrani(musteriId: string) {
    try {
      console.log('🔍 İskonto hesaplanıyor, Müşteri ID:', musteriId)
      const bugun = new Date().toISOString().split('T')[0] // Sadece tarih kısmı
      console.log('📅 Bugünün tarihi:', bugun)

      // Bireysel iskonto kontrolü
      const { data: bireyselIskonto, error: bireyselError } = await supabase
        .from('iskontolar')
        .select('*')
        .eq('hedef_id', musteriId)
        .eq('hedef_tipi', 'musteri')
        .eq('aktif', true)
        .lte('baslangic_tarihi', bugun)
        .gte('bitis_tarihi', bugun)
        .order('iskonto_orani', { ascending: false })
        .limit(1)
        .maybeSingle()

      console.log('👤 Bireysel iskonto sorgusu:', { bireyselIskonto, bireyselError })

      if (bireyselIskonto) {
        console.log('✅ Bireysel iskonto bulundu:', bireyselIskonto.iskonto_orani)
        setIskontoOrani(bireyselIskonto.iskonto_orani)
        return
      }

      // Müşteri bilgisini al (grup ve özel iskonto)
      const { data: musteri } = await supabase
        .from('musteriler')
        .select('fiyat_grubu_id, ozel_iskonto_orani')
        .eq('id', musteriId)
        .maybeSingle()

      console.log('👥 Müşteri bilgisi:', musteri)

      if (!musteri) {
        console.log('❌ Müşteri bulunamadı')
        setGrupIskontoOrani(0)
        setOzelIskontoOrani(0)
        setIskontoOrani(0)
        return
      }

      let grupIskonto = 0
      let ozelIskonto = musteri.ozel_iskonto_orani || 0

      // Grup iskontosunu al
      if (musteri.fiyat_grubu_id) {
        const { data: fiyatGrubu } = await supabase
          .from('fiyat_gruplari')
          .select('indirim_orani')
          .eq('id', musteri.fiyat_grubu_id)
          .eq('aktif_durum', true)
          .maybeSingle()

        console.log('🏷️ Fiyat grubu:', fiyatGrubu)

        if (fiyatGrubu) {
          grupIskonto = fiyatGrubu.indirim_orani || 0
          console.log('✅ Grup iskontosu:', grupIskonto)
        }
      }

      console.log('✅ Özel iskonto:', ozelIskonto)

      // Kademeli iskonto hesapla (önce grup, sonra özel)
      // Örnek: 100 TL, %10 grup, %5 özel
      // 1. 100 - (100 * 0.10) = 90 TL
      // 2. 90 - (90 * 0.05) = 85.5 TL
      // Toplam indirim: 14.5 TL = %14.5

      let toplamIskontoOrani = 0
      if (grupIskonto > 0 || ozelIskonto > 0) {
        // Kademeli hesaplama için örnek fiyat kullan
        const ornekFiyat = 100
        let mevcutFiyat = ornekFiyat

        // Grup iskontosunu uygula
        if (grupIskonto > 0) {
          mevcutFiyat -= (mevcutFiyat * grupIskonto) / 100
        }

        // Özel iskontonu uygula
        if (ozelIskonto > 0) {
          mevcutFiyat -= (mevcutFiyat * ozelIskonto) / 100
        }

        // Toplam iskonto oranını hesapla
        toplamIskontoOrani = ((ornekFiyat - mevcutFiyat) / ornekFiyat) * 100
      }

      setGrupIskontoOrani(grupIskonto)
      setOzelIskontoOrani(ozelIskonto)
      setIskontoOrani(Math.round(toplamIskontoOrani * 100) / 100)

      console.log('💰 Grup:', grupIskonto, '% | Özel:', ozelIskonto, '% | Toplam:', toplamIskontoOrani.toFixed(2), '%')
    } catch (error) {
      console.error('❌ İskonto hesaplama hatası:', error)
      setIskontoOrani(0)
    }
  }

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

      // İskonto oranını hesapla
      if (musteri) {
        await hesaplaIskontoOrani(musteri.id)
      }
    }

    return result
  }

  async function signUp(email: string, password: string, userData: any) {
    const result = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          soyad: userData.soyad,
          telefon: userData.telefon,
          musteri_tipi: userData.musteri_tipi,
          vergi_dairesi: userData.vergi_dairesi,
          vergi_no: userData.vergi_no,
          bayi_unvani: userData.bayi_unvani
        }
      }
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
        vergi_dairesi: userData.vergi_dairesi,
        vergi_no: userData.vergi_no,
        bayi_unvani: userData.bayi_unvani,
        bayi_no: userData.musteri_tipi === 'bayi' ? `BAYI-${Math.floor(100000 + Math.random() * 900000)}` : null,
        aktif_durum: true
      })
    }

    return result
  }

  async function signOut() {
    await supabase.auth.signOut()
    setIsAdmin(false)
    setMusteriData(null)
    // İskonto oranlarını sıfırla
    setIskontoOrani(0)
    setGrupIskontoOrani(0)
    setOzelIskontoOrani(0)
  }

  async function updateUser(data: { ad?: string; soyad?: string; telefon?: string; adres?: string }) {
    if (!user || !musteriData) throw new Error('Kullanıcı bulunamadı')

    const updates: any = { ...data }

    const { data: updatedData, error } = await supabase
      .from('musteriler')
      .update(updates)
      .eq('id', musteriData.id)
      .select()
      .single()

    if (error) throw error

    // Local state'i güncelle - fiyat_gruplari verisini koru
    setMusteriData({ ...musteriData, ...updatedData })

    return updatedData
  }

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, musteriData, iskontoOrani, grupIskontoOrani, ozelIskontoOrani, signIn, signUp, signOut, updateUser }}>
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
