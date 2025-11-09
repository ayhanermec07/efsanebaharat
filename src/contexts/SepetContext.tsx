import React, { createContext, useContext, useState, useEffect } from 'react'

interface SepetItem {
  urun_id: string
  urun_adi: string
  birim_turu: string
  birim_fiyat: number
  miktar: number
  gorsel_url?: string
  min_siparis_miktari?: number
}

interface SepetContextType {
  sepetItems: SepetItem[]
  sepeteEkle: (item: SepetItem) => void
  sepettenCikar: (urun_id: string, birim_turu: string) => void
  miktarGuncelle: (urun_id: string, birim_turu: string, miktar: number) => void
  sepetiTemizle: () => void
  toplamTutar: number
  toplamAdet: number
}

const SepetContext = createContext<SepetContextType | undefined>(undefined)

export function SepetProvider({ children }: { children: React.ReactNode }) {
  const [sepetItems, setSepetItems] = useState<SepetItem[]>(() => {
    const saved = localStorage.getItem('sepet')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('sepet', JSON.stringify(sepetItems))
  }, [sepetItems])

  const sepeteEkle = (item: SepetItem) => {
    setSepetItems(prev => {
      const existing = prev.find(
        i => i.urun_id === item.urun_id && i.birim_turu === item.birim_turu
      )
      
      if (existing) {
        return prev.map(i =>
          i.urun_id === item.urun_id && i.birim_turu === item.birim_turu
            ? { ...i, miktar: i.miktar + item.miktar }
            : i
        )
      }
      
      return [...prev, item]
    })
  }

  const sepettenCikar = (urun_id: string, birim_turu: string) => {
    setSepetItems(prev =>
      prev.filter(i => !(i.urun_id === urun_id && i.birim_turu === birim_turu))
    )
  }

  const miktarGuncelle = (urun_id: string, birim_turu: string, miktar: number) => {
    if (miktar <= 0) {
      sepettenCikar(urun_id, birim_turu)
      return
    }
    
    setSepetItems(prev =>
      prev.map(i =>
        i.urun_id === urun_id && i.birim_turu === birim_turu
          ? { ...i, miktar }
          : i
      )
    )
  }

  const sepetiTemizle = () => {
    setSepetItems([])
  }

  const toplamTutar = sepetItems.reduce(
    (total, item) => total + item.birim_fiyat * item.miktar,
    0
  )

  const toplamAdet = sepetItems.reduce((total, item) => total + item.miktar, 0)

  return (
    <SepetContext.Provider
      value={{
        sepetItems,
        sepeteEkle,
        sepettenCikar,
        miktarGuncelle,
        sepetiTemizle,
        toplamTutar,
        toplamAdet
      }}
    >
      {children}
    </SepetContext.Provider>
  )
}

export function useSepet() {
  const context = useContext(SepetContext)
  if (context === undefined) {
    throw new Error('useSepet must be used within a SepetProvider')
  }
  return context
}
