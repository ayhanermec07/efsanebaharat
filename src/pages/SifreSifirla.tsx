import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function SifreSifirla({ mode = 'request' }: { mode?: 'request' | 'update' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [checkingSession, setCheckingSession] = useState(mode === 'update')
  const [hasSession, setHasSession] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (mode !== 'update') return
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setHasSession(Boolean(session))
        setCheckingSession(false)
      }
    })
    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (active) {
        setHasSession(!sessionError && Boolean(data.session))
        setCheckingSession(false)
      }
    }).catch(() => {
      if (active) setCheckingSession(false)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [mode])

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/sifre-yenile`,
      })
      if (resetError) throw resetError
      // Hesabın varlığını açıklamayan aynı sonucu göster.
      setSuccess(true)
    } catch {
      setError('İstek gönderilemedi. Biraz sonra tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (loading) return
    if (password.length < 12) {
      setError('Yeni şifre en az 12 karakter olmalıdır.')
      return
    }
    if (password !== confirmation) {
      setError('Şifreler eşleşmiyor.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setPassword('')
      setConfirmation('')
      setSuccess(true)
    } catch {
      setError('Şifre değiştirilemedi. Bağlantı süresi dolmuş olabilir; yeni bir bağlantı isteyin.')
    } finally {
      setLoading(false)
    }
  }

  const updating = mode === 'update'
  return (
    <div className="shop-container py-8 sm:py-12">
      <section className="mx-auto w-full max-w-md min-w-0 rounded-lg border border-zinc-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="mb-6 grid h-12 w-12 place-items-center rounded-lg bg-emerald-800 text-white">
          {updating ? <KeyRound className="h-6 w-6" aria-hidden="true" /> : <Mail className="h-6 w-6" aria-hidden="true" />}
        </div>
        <h1 className="text-2xl font-bold text-zinc-950 sm:text-3xl">{updating ? 'Yeni şifre belirle' : 'Şifreni sıfırla'}</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {updating ? 'Hesabınız için yeni bir şifre girin.' : 'E-posta adresinizi yazın; hesabınız varsa sıfırlama bağlantısı gönderelim.'}
        </p>

        {error && <p role="alert" className="mt-5 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {success ? (
          <div role="status" className="mt-6 space-y-4">
            <p className="rounded-lg bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              {updating ? 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' : 'Bu e-postaya kayıtlı bir hesap varsa sıfırlama bağlantısı gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.'}
            </p>
            <Link to="/giris" className="shop-btn-primary flex min-h-11 w-full items-center justify-center">Giriş sayfasına dön</Link>
          </div>
        ) : updating ? (
          checkingSession ? <p role="status" className="mt-6 text-sm text-zinc-600">Bağlantı doğrulanıyor...</p>
            : hasSession ? (
              <form onSubmit={updatePassword} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="new-password" className="mb-1.5 block text-sm font-semibold text-zinc-800">Yeni şifre</label>
                  <div className="relative">
                    <input id="new-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} required value={password} onChange={(event) => setPassword(event.target.value)} className="shop-input pr-12" />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'} className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-zinc-600 focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700">
                      {showPassword ? <EyeOff className="h-5 w-5" aria-hidden="true" /> : <Eye className="h-5 w-5" aria-hidden="true" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-zinc-600">En az 12 karakter kullanın.</p>
                </div>
                <div>
                  <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-semibold text-zinc-800">Yeni şifreyi tekrar girin</label>
                  <input id="confirm-password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={12} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="shop-input" />
                </div>
                <button type="submit" disabled={loading} className="shop-btn-primary min-h-11 w-full">{loading ? 'Güncelleniyor...' : 'Şifreyi güncelle'}</button>
              </form>
            ) : <div className="mt-6 space-y-4 text-sm"><p role="alert" className="text-red-800">Bağlantı geçersiz veya süresi dolmuş. Yeni bir sıfırlama bağlantısı isteyin.</p><Link to="/sifre-sifirla" className="inline-flex min-h-11 items-center font-semibold text-emerald-800 underline">Yeni bağlantı iste</Link></div>
        ) : (
          <form onSubmit={requestReset} className="mt-6 space-y-4">
            <div>
              <label htmlFor="reset-email" className="mb-1.5 block text-sm font-semibold text-zinc-800">E-posta adresi</label>
              <input id="reset-email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} className="shop-input" placeholder="ornek@email.com" />
            </div>
            <button type="submit" disabled={loading} className="shop-btn-primary min-h-11 w-full">{loading ? 'Gönderiliyor...' : 'Sıfırlama bağlantısı gönder'}</button>
          </form>
        )}
        {!success && <Link to="/giris" className="mt-5 inline-flex min-h-11 items-center text-sm font-semibold text-emerald-800 underline-offset-4 hover:underline">Giriş sayfasına dön</Link>}
      </section>
    </div>
  )
}
