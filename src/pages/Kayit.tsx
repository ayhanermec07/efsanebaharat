import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, Info, LockKeyhole, UserPlus } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Kayit() {
  const [formData, setFormData] = useState({
    ad: '', soyad: '', telefon: '', email: '', adres: '', password: '', passwordConfirmation: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const { signUp } = useAuth()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')
    if (formData.password.length < 8) return setError('Şifreniz en az 8 karakter olmalıdır.')
    if (formData.password !== formData.passwordConfirmation) return setError('Şifre ve şifre tekrarı aynı olmalıdır.')

    setLoading(true)
    try {
      const result = await signUp(formData.email.trim(), formData.password, formData)
      if (result.error) {
        if (/already registered|already been registered/i.test(result.error.message)) {
          throw new Error('Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın veya farklı bir e-posta kullanın.')
        }
        throw result.error
      }
      if (!result.data?.user || !result.data.user.identities?.length) {
        throw new Error('Bu e-posta adresi zaten kayıtlı. Lütfen giriş yapın veya farklı bir e-posta kullanın.')
      }
      setSubmitted(true)
    } catch (err: any) {
      console.error('Kayıt hatası:', err)
      setError(err.message || 'Kayıt olurken bir sorun oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    setFormData((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  if (submitted) {
    return <div className="shop-container py-8 sm:py-12"><div className="mx-auto max-w-2xl rounded-xl border border-emerald-100 bg-white p-6 text-center shadow-lg sm:p-10">
      <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
      <h1 className="mt-4 text-2xl font-bold text-zinc-950">Başvurunuz alındı</h1>
      <p className="mt-3 text-sm leading-6 text-zinc-600">E-posta adresinize doğrulama bağlantısı gönderildi. Doğrulama sonrasında başvurunuz yönetici onayına düşecek. Hesabınız, müşteri türünüz seçilip onaylandıktan sonra kullanılabilir olacaktır.</p>
      <Link to="/giris" className="shop-btn-primary mt-6 inline-flex">Giriş sayfasına git</Link>
    </div></div>
  }

  return <div className="shop-container py-8 sm:py-12"><div className="mx-auto max-w-3xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg">
    <div className="bg-zinc-950 p-5 text-white sm:p-8">
      <div className="shop-eyebrow border-white/20 bg-white/10 text-orange-100"><UserPlus className="h-4 w-4" /> Müşteri başvurusu</div>
      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">Kayıt ol</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-300">XML veya toptan müşteri olmak için bilgilerinizi girin. Başvurunuz yönetici onayından sonra aktifleşir.</p>
    </div>
    <div className="p-5 sm:p-8">
      <div className="mb-6 flex gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900"><Info className="mt-0.5 h-5 w-5 shrink-0" /><p>Müşteri türünüzü ve fiyat grubunuzu yönetici belirler. Bu nedenle kayıt sonrasında doğrudan sipariş veremezsiniz.</p></div>
      {error && <div className="mb-6 rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Ad" name="ad" value={formData.ad} onChange={handleChange} required autoComplete="given-name" /><Field label="Soyad" name="soyad" value={formData.soyad} onChange={handleChange} required autoComplete="family-name" /></div>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Telefon numarası" name="telefon" type="tel" value={formData.telefon} onChange={handleChange} required autoComplete="tel" /><Field label="E-posta adresi" name="email" type="email" value={formData.email} onChange={handleChange} required autoComplete="email" /></div>
        <label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-700">Adres <span className="font-normal text-zinc-500">(isteğe bağlı)</span></span><textarea name="adres" value={formData.adres} onChange={handleChange} rows={4} className="shop-input resize-y" autoComplete="street-address" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Şifre" name="password" type="password" value={formData.password} onChange={handleChange} required minLength={8} autoComplete="new-password" /><Field label="Şifre tekrarı" name="passwordConfirmation" type="password" value={formData.passwordConfirmation} onChange={handleChange} required minLength={8} autoComplete="new-password" /></div>
        <button type="submit" disabled={loading} className="shop-btn-primary min-h-11 w-full">{loading ? <><span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> Kayıt yapılıyor...</> : <><LockKeyhole className="h-5 w-5" /> Kayıt ol</>}</button>
      </form>
      <div className="mt-6 text-center text-sm text-zinc-600">Zaten hesabınız var mı? <Link to="/giris" className="font-bold text-orange-700 hover:text-orange-800">Giriş yap</Link></div>
    </div>
  </div></div>
}

interface FieldProps { label: string; name: string; value: string; onChange: (event: React.ChangeEvent<HTMLInputElement>) => void; type?: string; required?: boolean; minLength?: number; autoComplete?: string }

function Field({ label, name, value, onChange, type = 'text', required, minLength, autoComplete }: FieldProps) {
  return <label className="block"><span className="mb-1.5 block text-sm font-bold text-zinc-700">{label}</span><input type={type} name={name} value={value} onChange={onChange} required={required} minLength={minLength} autoComplete={autoComplete} className="shop-input" /></label>
}
