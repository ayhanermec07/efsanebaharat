/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import { publicSupabase, supabase } from '../lib/supabase'
import { colorForWhiteText, defaultTheme, normalizeTheme, THEME_DESIGN, type ThemeSettings } from '../lib/theme'

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

const defaultLogo: LogoSettings = {
    url: null,
    width: 120,
}

const defaultSiteInfo: SiteInfoSettings = {
    siteName: 'Efsane Baharat',
    tagline: 'Premium baharat ve gıda',
    description: 'Günlük mutfaktan profesyonel kullanıma kadar taze, seçili ve güvenilir baharat ürünleri.',
    phone: '',
    email: '',
    address: '',
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

const normalizeContact = (value: unknown, maxLength: number, oldPlaceholder: string) => {
    const normalized = typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
    return normalized === oldPlaceholder ? '' : normalized
}

const normalizeSiteInfo = (value: unknown): SiteInfoSettings => {
    const setting = value && typeof value === 'object' ? value as Partial<SiteInfoSettings> : {}
    return {
        siteName: normalizeText(setting.siteName, defaultSiteInfo.siteName, 80),
        tagline: normalizeText(setting.tagline, defaultSiteInfo.tagline, 120),
        description: normalizeText(setting.description, defaultSiteInfo.description, 300),
        phone: normalizeContact(setting.phone, 40, '0850 123 45 67'),
        email: normalizeContact(setting.email, 160, 'info@efsanebaharat.com'),
        address: normalizeContact(setting.address, 200, 'İstanbul, Türkiye'),
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

        root.style.setProperty('--site-primary-color', theme.primaryColor)
        root.style.setProperty('--site-primary-contrast-color', colorForWhiteText(theme.primaryColor))
        root.style.setProperty('--site-secondary-color', theme.secondaryColor)
        root.style.setProperty('--site-secondary-contrast-color', colorForWhiteText(theme.secondaryColor))
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
        const normalizedSettings = normalizeTheme({ ...settings, design: THEME_DESIGN })
        const { error } = await supabase
            .from('site_settings')
            .upsert({
                setting_key: 'theme',
                setting_value: { ...normalizedSettings, design: THEME_DESIGN },
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
