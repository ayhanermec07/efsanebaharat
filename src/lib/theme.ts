export interface ThemeSettings {
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
}

export const THEME_DESIGN = 'anadolu-aktari'

export const defaultTheme: ThemeSettings = {
  primaryColor: '#34513c',
  secondaryColor: '#a84b2b',
  backgroundColor: '#f7f2e8',
}

const normalizeColor = (value: unknown, fallback: string) =>
  typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : fallback

export function normalizeTheme(value: unknown): ThemeSettings {
  const setting = value && typeof value === 'object' ? value as Partial<ThemeSettings> & { design?: string } : {}
  // Önceki görünümün kayıtları, yeni tasarımı ilk yükleme sonrasında geri çevirmemeli.
  if (setting.design !== THEME_DESIGN) return { ...defaultTheme }
  return {
    primaryColor: normalizeColor(setting.primaryColor, defaultTheme.primaryColor),
    secondaryColor: normalizeColor(setting.secondaryColor, defaultTheme.secondaryColor),
    backgroundColor: normalizeColor(setting.backgroundColor, defaultTheme.backgroundColor),
  }
}

export function colorForWhiteText(color: string) {
  const channels = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16))
  const contrast = () => {
    const [red, green, blue] = channels.map(value => {
      const normalized = value / 255
      return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
    })
    return 1.05 / (0.2126 * red + 0.7152 * green + 0.0722 * blue + 0.05)
  }
  while (contrast() < 4.5) channels.forEach((value, index) => { channels[index] = Math.floor(value * 0.95) })
  return `#${channels.map(value => value.toString(16).padStart(2, '0')).join('')}`
}
