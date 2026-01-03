import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface ThemeSettings {
    primaryColor: string
    secondaryColor: string
}

interface LogoSettings {
    url: string | null
    width: number
}

interface ThemeContextType {
    theme: ThemeSettings
    logo: LogoSettings
    updateTheme: (settings: ThemeSettings) => Promise<void>
    updateLogo: (settings: LogoSettings) => Promise<void>
    loading: boolean
}

const defaultTheme: ThemeSettings = {
    primaryColor: '#ea580c', // orange-600
    secondaryColor: '#dc2626', // red-600
}

const defaultLogo: LogoSettings = {
    url: null,
    width: 120,
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeSettings>(defaultTheme)
    const [logo, setLogo] = useState<LogoSettings>(defaultLogo)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadSettings()
    }, [])

    // CSS değişkenlerini güncelle
    useEffect(() => {
        const root = document.documentElement

        // Hex to RGB conversion for Tailwind opacity support if needed
        // For now, we'll just set the hex values directly/
        // Note: Tailwind uses specific color names, but we can override some defaults or use
        // style={} prop in components. A better approach for global theme with Tailwind
        // is using CSS variables.

        root.style.setProperty('--color-primary', theme.primaryColor)
        root.style.setProperty('--color-secondary', theme.secondaryColor)

    }, [theme])

    const loadSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('site_settings')
                .select('*')

            if (error) {
                console.error('Ayarlar yüklenirken hata:', error)
                return
            }

            if (data) {
                const themeSetting = data.find(s => s.setting_key === 'theme')
                const logoSetting = data.find(s => s.setting_key === 'logo')

                if (themeSetting) setTheme(themeSetting.setting_value)
                if (logoSetting) setLogo(logoSetting.setting_value)
            }
        } catch (err) {
            console.error('Beklenmeyen hata:', err)
        } finally {
            setLoading(false)
        }
    }

    const updateTheme = async (settings: ThemeSettings) => {
        setTheme(settings) // Optimistic update

        const { error } = await supabase
            .from('site_settings')
            .upsert({
                setting_key: 'theme',
                setting_value: settings,
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' })

        if (error) {
            console.error('Tema güncellenemedi:', error)
            // Revert needs to handle logic
        }
    }

    const updateLogo = async (settings: LogoSettings) => {
        setLogo(settings)

        const { error } = await supabase
            .from('site_settings')
            .upsert({
                setting_key: 'logo',
                setting_value: settings,
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' })

        if (error) {
            console.error('Logo güncellenemedi:', error)
        }
    }

    return (
        <ThemeContext.Provider value={{ theme, logo, updateTheme, updateLogo, loading }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
