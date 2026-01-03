import { useState, useRef } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useTheme } from '../../contexts/ThemeContext'
import { supabase } from '../../lib/supabase'
import { createClient } from '@supabase/supabase-js'
import { uploadImage } from '../../utils/imageUpload'
import toast from 'react-hot-toast'
import { Save, RefreshCw, Upload, Shield, Palette, UserPlus } from 'lucide-react'

// Supabase config for temporary client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://uvagzvevktzzfrzkvtsd.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV2YWd6dmV2a3R6emZyemt2dHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNzA1NDMsImV4cCI6MjA3Nzg0NjU0M30.ENrSW4rJmbwEWi6eSynCuXv8CdC9JroK-fpiIiVYwP0'

export default function Ayarlar() {
    const { theme, logo, updateTheme, updateLogo } = useTheme()
    const { user } = useAuth()

    const [activeTab, setActiveTab] = useState<'tasarim' | 'yoneticiler'>('tasarim')

    // Tasarım form state
    const [primaryColor, setPrimaryColor] = useState(theme.primaryColor)
    const [secondaryColor, setSecondaryColor] = useState(theme.secondaryColor)
    const [logoWidth, setLogoWidth] = useState(logo.width)
    const [loading, setLoading] = useState(false)

    // Yönetici form state (Mevcut kullanıcı)
    const [adminEmail, setAdminEmail] = useState('')
    const [adminLoading, setAdminLoading] = useState(false)

    // Yeni Admin Oluşturma State
    const [newItemEmail, setNewItemEmail] = useState('')
    const [newItemPassword, setNewItemPassword] = useState('')
    const [newItemName, setNewItemName] = useState('')
    const [newItemSurname, setNewItemSurname] = useState('')
    const [newAdminLoading, setNewAdminLoading] = useState(false)

    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleThemeSave = async () => {
        setLoading(true)
        try {
            await updateTheme({
                primaryColor,
                secondaryColor
            })
            toast.success('Tema ayarları kaydedildi')
        } catch (error) {
            toast.error('Ayarlar kaydedilemedi')
        } finally {
            setLoading(false)
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        try {
            const url = await uploadImage(file, 'site-assets')
            if (url) {
                await updateLogo({
                    url,
                    width: logoWidth
                })
                toast.success('Logo güncellendi')
            }
        } catch (error) {
            console.error(error)
            toast.error('Logo yüklenemedi')
        } finally {
            setLoading(false)
        }
    }

    const handleLogoWidthChange = async () => {
        setLoading(true)
        try {
            await updateLogo({
                url: logo.url,
                width: logoWidth
            })
            toast.success('Logo boyutu güncellendi')
        } catch (error) {
            toast.error('Hata oluştu')
        } finally {
            setLoading(false)
        }
    }

    const handleAddAdmin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!adminEmail) return

        setAdminLoading(true)
        try {
            const { error } = await supabase
                .from('admin_users')
                .insert({ user_id: adminEmail, role: 'admin' }) // adminEmail burada ID olarak kullanılacak

            if (error) throw error

            toast.success('Admin yetkisi verildi')
            setAdminEmail('')
        } catch (error: any) {
            console.error(error)
            toast.error('İşlem başarısız: ' + (error.message || 'Bilinmeyen hata'))
        } finally {
            setAdminLoading(false)
        }
    }

    const handleCreateNewAdmin = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newItemEmail || !newItemPassword || !newItemName) {
            toast.error('Lütfen tüm alanları doldurun')
            return
        }

        setNewAdminLoading(true)
        try {
            // Geçici bir client oluştur (Mevcut oturumu bozmamak için)
            // persistSession: false önemli!
            const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            })

            // 1. Yeni kullanıcıyı oluştur
            const { data: authData, error: authError } = await tempSupabase.auth.signUp({
                email: newItemEmail,
                password: newItemPassword,
                options: {
                    data: {
                        ad: newItemName,
                        soyad: newItemSurname || '',
                        musteri_tipi: 'admin' // İsteğe bağlı
                    }
                }
            })

            if (authError) throw authError
            if (!authData.user) throw new Error('Kullanıcı oluşturulamadı')

            const newUserId = authData.user.id

            // 2. Müşteri kaydını oluştur (Normalde trigger yapabilir ama biz manuel garanti edelim)
            // Bunu ANA client ile yapıyoruz çünkü admin yetkisi gerekebilir veya trigger çalıştıysa hata verebilir (conflict)
            // Eğer trigger varsa conflict te nothing yaparız.
            const { error: customerError } = await supabase
                .from('musteriler')
                .insert({
                    user_id: newUserId,
                    ad: newItemName,
                    soyad: newItemSurname || '',
                    musteri_tipi: 'admin', // Admin tipi yoksa musteri olabilir
                    aktif_durum: true
                })
                .select() // Varsa

            // Eğer müşteri tablosunda user_id unique ise ve trigger zaten eklediyse hata verebilir.
            // Bu yüzden try-catch içinde veya ignore ederek geçebiliriz.
            // Ancak en önemlisi admin_users tablosu.

            // 3. Admin yetkisi ver
            const { error: adminError } = await supabase
                .from('admin_users')
                .insert({
                    user_id: newUserId,
                    role: 'admin'
                })

            if (adminError) throw adminError

            toast.success('Yeni admin kullanıcısı oluşturuldu!')
            setNewItemEmail('')
            setNewItemPassword('')
            setNewItemName('')
            setNewItemSurname('')

        } catch (error: any) {
            console.error('Yeni admin oluşturma hatası:', error)
            toast.error('Hata: ' + (error.message || 'Bilinmeyen hata'))
        } finally {
            setNewAdminLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900">Ayarlar</h1>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="flex border-b">
                    <button
                        onClick={() => setActiveTab('tasarim')}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition ${activeTab === 'tasarim'
                            ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Palette className="w-4 h-4" />
                        Tasarım Ayarları
                    </button>
                    <button
                        onClick={() => setActiveTab('yoneticiler')}
                        className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition ${activeTab === 'yoneticiler'
                            ? 'border-b-2 border-orange-500 text-orange-600 bg-orange-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        <Shield className="w-4 h-4" />
                        Yönetici Hesapları
                    </button>
                </div>

                <div className="p-6">
                    {activeTab === 'tasarim' && (
                        <div className="max-w-xl space-y-8">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Renk Teması</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Ana Renk (Primary)
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={primaryColor}
                                                onChange={(e) => setPrimaryColor(e.target.value)}
                                                className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                                            />
                                            <span className="text-sm text-gray-500 font-mono">{primaryColor}</span>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Butonlar, linkler ve vurgulamalar için.</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            İkincil Renk (Secondary)
                                        </label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="color"
                                                value={secondaryColor}
                                                onChange={(e) => setSecondaryColor(e.target.value)}
                                                className="h-10 w-20 rounded border border-gray-300 cursor-pointer"
                                            />
                                            <span className="text-sm text-gray-500 font-mono">{secondaryColor}</span>
                                        </div>
                                        <p className="mt-1 text-xs text-gray-500">Uyarılar ve ikincil eylemler için.</p>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <button
                                        onClick={handleThemeSave}
                                        disabled={loading}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />
                                        {loading ? 'Kaydediliyor...' : 'Renkleri Kaydet'}
                                    </button>
                                </div>
                            </div>

                            <div className="border-t pt-8">
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Logo Ayarları</h3>

                                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                    {logo.url ? (
                                        <div className="mb-4">
                                            <img
                                                src={logo.url}
                                                alt="Site Logo"
                                                style={{ width: logoWidth, margin: '0 auto' }}
                                                className="object-contain" // Fixed max height removed to rely on width
                                            />
                                        </div>
                                    ) : (
                                        <div className="mb-4 text-gray-400">
                                            Logo yüklenmemiş
                                        </div>
                                    )}

                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        onChange={handleLogoUpload}
                                        accept="image/*"
                                        className="hidden"
                                    />

                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={loading}
                                        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition"
                                    >
                                        <Upload className="w-4 h-4" />
                                        Logo Yükle
                                    </button>
                                </div>

                                <div className="mt-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Logo Genişliği (px)
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <input
                                            type="range"
                                            min="50"
                                            max="300"
                                            value={logoWidth}
                                            onChange={(e) => setLogoWidth(parseInt(e.target.value))}
                                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                        />
                                        <span className="text-sm font-medium text-gray-900 w-16 text-right">
                                            {logoWidth}px
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <button
                                        onClick={handleLogoWidthChange}
                                        disabled={loading}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                                    >
                                        <Save className="w-4 h-4" />
                                        {loading ? 'Kaydediliyor...' : 'Boyutu Kaydet'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'yoneticiler' && (
                        <div className="max-w-2xl space-y-12">
                            {/* Bölüm 1: Yeni Admin Kullanıcısı Oluşturma */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Yeni Admin Kullanıcısı Oluştur</h3>
                                <p className="text-sm text-gray-500 mb-6">
                                    Bu bölümden siteye giriş yapmamış, tamamen yeni bir kullanıcı hesabı oluşturup doğrudan admin yetkisi verebilirsiniz.
                                </p>

                                <form onSubmit={handleCreateNewAdmin} className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Ad <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                required
                                                value={newItemName}
                                                onChange={e => setNewItemName(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Soyad</label>
                                            <input
                                                type="text"
                                                value={newItemSurname}
                                                onChange={e => setNewItemSurname(e.target.value)}
                                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">E-posta <span className="text-red-500">*</span></label>
                                        <input
                                            type="email"
                                            required
                                            value={newItemEmail}
                                            onChange={e => setNewItemEmail(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Şifre <span className="text-red-500">*</span></label>
                                        <input
                                            type="password"
                                            required
                                            minLength={6}
                                            value={newItemPassword}
                                            onChange={e => setNewItemPassword(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-orange-500 focus:border-orange-500"
                                            placeholder="En az 6 karakter"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={newAdminLoading}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        {newAdminLoading ? 'Oluşturuluyor...' : 'Yeni Admin Kullanıcısı Oluştur'}
                                    </button>
                                </form>
                            </div>

                            {/* Bölüm 2: Mevcut Kullanıcıyı Admin Yapma */}
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">Mevcut Kullanıcıya Yetki Ver</h3>
                                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <Shield className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-blue-700">
                                                Buradan sisteme zaten kayıtlı olan bir kullanıcıya yönetici yetkisi verebilirsiniz.
                                                <br />
                                                <strong>Gereksinim:</strong> Kullanıcının benzersiz ID'sini (UUID) girmeniz gerekir.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <form onSubmit={handleAddAdmin} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Kullanıcı ID (UUID)
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            placeholder="Örn: a0eebc99-9c0b..."
                                            value={adminEmail}
                                            onChange={(e) => setAdminEmail(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={adminLoading}
                                        className="flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50 w-full"
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        {adminLoading ? 'İşleniyor...' : 'Mevcut Kullanıcıyı Admin Yap'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
