/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { publicSupabase, supabase } from '../lib/supabase'

interface ThemeSettings {
    primaryColor: string
    secondaryColor: string
    backgroundColor: string
}

interface LogoSettings {
    url: string | null
    width: number
}

interface SiteInfoSettings {
    siteName: string
    tagline: string
    description: string
    phone: string
    email: string
    address: string
}

interface ThemeContextType {
    theme: ThemeSettings
    logo: LogoSettings
    siteInfo: SiteInfoSettings
    updateTheme: (settings: ThemeSettings) => Promise<void>
    updateLogo: (settings: LogoSettings) => Promise<void>
    updateSiteInfo: (settings: SiteInfoSettings) => Promise<void>
    loading: boolean
}

const defaultTheme: ThemeSettings = {
    primaryColor: '#ea580c', // orange-600
    secondaryColor: '#dc2626', // red-600
    backgroundColor: '#f9fafb', // gray-50
}

const defaultLogo: LogoSettings = {
    url: null,
    width: 120,
}

const defaultSiteInfo: SiteInfoSettings = {
    siteName: 'Efsane Baharat',
    tagline: 'Premium baharat ve gıda',
    description: 'Günlük mutfaktan profesyonel kullanıma kadar taze, seçili ve güvenilir baharat ürünleri.',
    phone: '0850 123 45 67',
    email: 'info@efsanebaharat.com',
    address: 'İstanbul, Türkiye',
}

const normalizeColor = (value: unknown, fallback: string) =>
    typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback

const normalizeTheme = (value: unknown): ThemeSettings => {
    const setting = value && typeof value === 'object' ? value as Partial<ThemeSettings> : {}
    return {
        primaryColor: normalizeColor(setting.primaryColor, defaultTheme.primaryColor),
        secondaryColor: normalizeColor(setting.secondaryColor, defaultTheme.secondaryColor),
        backgroundColor: normalizeColor(setting.backgroundColor, defaultTheme.backgroundColor),
    }
}

const normalizeLogo = (value: unknown): LogoSettings => {
    const setting = value && typeof value === 'object' ? value as Partial<LogoSettings> : {}
    const requestedWidth = Number(setting.width)

    return {
        url: typeof setting.url === 'string' && setting.url.length > 0 ? setting.url : null,
        width: Number.isFinite(requestedWidth) ? Math.min(240, Math.max(50, requestedWidth)) : defaultLogo.width,
    }
}

const normalizeText = (value: unknown, fallback: string, maxLength: number) => {
    if (typeof value !== 'string') return fallback
    const normalized = value.trim().slice(0, maxLength)
    return normalized || fallback
}

const normalizeSiteInfo = (value: unknown): SiteInfoSettings => {
    const setting = value && typeof value === 'object' ? value as Partial<SiteInfoSettings> : {}
    return {
        siteName: normalizeText(setting.siteName, defaultSiteInfo.siteName, 80),
        tagline: normalizeText(setting.tagline, defaultSiteInfo.tagline, 120),
        description: normalizeText(setting.description, defaultSiteInfo.description, 300),
        phone: normalizeText(setting.phone, defaultSiteInfo.phone, 40),
        email: normalizeText(setting.email, defaultSiteInfo.email, 160),
        address: normalizeText(setting.address, defaultSiteInfo.address, 200),
    }
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<ThemeSettings>(defaultTheme)
    const [logo, setLogo] = useState<LogoSettings>(defaultLogo)
    const [siteInfo, setSiteInfo] = useState<SiteInfoSettings>(defaultSiteInfo)
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

        root.style.setProperty('--site-primary-color', theme.primaryColor)
        root.style.setProperty('--site-secondary-color', theme.secondaryColor)
        root.style.setProperty('--site-background-color', theme.backgroundColor)
        document.body.style.backgroundColor = theme.backgroundColor

    }, [theme])

    const loadSettings = async () => {
        try {
            const { data, error } = await publicSupabase
                .from('site_settings')
                .select('*')

            if (error) {
                console.error('Ayarlar yüklenirken hata:', error)
                return
            }

            if (data) {
                const themeSetting = data.find(s => s.setting_key === 'theme')
                const logoSetting = data.find(s => s.setting_key === 'logo')
                const siteInfoSetting = data.find(s => s.setting_key === 'site_info')

                if (themeSetting) setTheme(normalizeTheme(themeSetting.setting_value))
                if (logoSetting) setLogo(normalizeLogo(logoSetting.setting_value))
                if (siteInfoSetting) setSiteInfo(normalizeSiteInfo(siteInfoSetting.setting_value))
            }
        } catch (err) {
            console.error('Beklenmeyen hata:', err)
        } finally {
            setLoading(false)
        }
    }

    const updateTheme = async (settings: ThemeSettings) => {
        const normalizedSettings = normalizeTheme(settings)
        const { error } = await supabase
            .from('site_settings')
            .upsert({
                setting_key: 'theme',
                setting_value: normalizedSettings,
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' })

        if (error) {
            console.error('Tema güncellenemedi:', error)
            throw error
        }

        setTheme(normalizedSettings)
    }

    const updateLogo = async (settings: LogoSettings) => {
        const normalizedSettings = normalizeLogo(settings)
        const { error } = await supabase
            .from('site_settings')
            .upsert({
                setting_key: 'logo',
                setting_value: normalizedSettings,
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' })

        if (error) {
            console.error('Logo güncellenemedi:', error)
            throw error
        }

        setLogo(normalizedSettings)
    }

    const updateSiteInfo = async (settings: SiteInfoSettings) => {
        const normalizedSettings = normalizeSiteInfo(settings)
        const { error } = await supabase
            .from('site_settings')
            .upsert({
                setting_key: 'site_info',
                setting_value: normalizedSettings,
                updated_at: new Date().toISOString()
            }, { onConflict: 'setting_key' })

        if (error) {
            console.error('Site bilgileri güncellenemedi:', error)
            throw error
        }

        setSiteInfo(normalizedSettings)
    }

    return (
        <ThemeContext.Provider value={{ theme, logo, siteInfo, updateTheme, updateLogo, updateSiteInfo, loading }}>
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
