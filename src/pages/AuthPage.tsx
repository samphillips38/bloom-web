import { useState, useEffect, useCallback } from 'react'
import { Leaf, Mail, Lock, User, AlertCircle } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import { useAuth } from '../context/AuthContext'
import Button from '../components/Button'

// ── Apple Sign-In types ──
declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (config: {
          clientId: string
          scope: string
          redirectURI: string
          usePopup: boolean
        }) => void
        signIn: () => Promise<{
          authorization: {
            id_token: string
            code: string
          }
          user?: {
            name?: { firstName?: string; lastName?: string }
            email?: string
          }
        }>
      }
    }
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID || ''

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [socialLoading, setSocialLoading] = useState<'google' | 'apple' | null>(null)

  const { login, register, googleLogin, appleLogin } = useAuth()

  // ── Load Apple JS SDK ──
  useEffect(() => {
    if (!APPLE_CLIENT_ID) return

    // Only load if not already present
    if (document.getElementById('apple-signin-sdk')) return

    const script = document.createElement('script')
    script.id = 'apple-signin-sdk'
    script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js'
    script.async = true
    script.onload = () => {
      window.AppleID?.auth.init({
        clientId: APPLE_CLIENT_ID,
        scope: 'name email',
        redirectURI: window.location.origin,
        usePopup: true,
      })
    }
    document.head.appendChild(script)
  }, [])

  // ── Email form submit ──
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (isLogin) {
        await login(email, password)
      } else {
        await register(name, email, password)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  // ── Google Sign-In ──
  const handleGoogleLogin = useGoogleLogin({
    flow: 'implicit',
    onSuccess: async (tokenResponse) => {
      setSocialLoading('google')
      setError('')
      try {
        // Send the access token to our backend, which verifies it
        // server-side against Google's userinfo endpoint
        await googleLogin(tokenResponse.access_token)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Google sign-in failed')
      } finally {
        setSocialLoading(null)
      }
    },
    onError: () => {
      setError('Google sign-in was cancelled')
      setSocialLoading(null)
    },
  })

  // ── Apple Sign-In ──
  const handleAppleLogin = useCallback(async () => {
    if (!window.AppleID) {
      setError('Apple Sign-In is not available')
      return
    }

    setSocialLoading('apple')
    setError('')

    try {
      const response = await window.AppleID.auth.signIn()
      await appleLogin(response.authorization.id_token, response.user)
    } catch (err: unknown) {
      // User cancelled or error
      const errorObj = err as { error?: string }
      if (errorObj?.error !== 'popup_closed_by_user') {
        setError('Apple sign-in failed. Please try again.')
      }
    } finally {
      setSocialLoading(null)
    }
  }, [appleLogin])

  return (
    <div className="min-h-screen bg-bloom-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-bloom-orange/10 mb-4">
            <Leaf size={48} className="text-bloom-orange" />
          </div>
          <h1 className="text-3xl font-bold text-bloom-text">Bloom</h1>
          <p className="text-bloom-text-secondary mt-2">Learn anything, beautifully.</p>
        </div>

        {/* Social buttons — show first for minimal friction */}
        <div className="space-y-3 animate-slide-up mb-6">
          {GOOGLE_CLIENT_ID && (
            <button
              onClick={() => handleGoogleLogin()}
              disabled={!!socialLoading}
              className="w-full py-3.5 px-4 rounded-2xl border border-gray-200 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialLoading === 'google' ? (
                <div className="w-5 h-5 border-2 border-gray-300 border-t-bloom-orange rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
              )}
              <span className="font-medium text-bloom-text">Continue with Google</span>
            </button>
          )}

          {APPLE_CLIENT_ID && (
            <button
              onClick={handleAppleLogin}
              disabled={!!socialLoading}
              className="w-full py-3.5 px-4 rounded-2xl bg-black text-white flex items-center justify-center gap-3 hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialLoading === 'apple' ? (
                <div className="w-5 h-5 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
              )}
              <span className="font-medium">Continue with Apple</span>
            </button>
          )}

          {/* Fallback: show social buttons even without client IDs, but disabled with tooltip */}
          {!GOOGLE_CLIENT_ID && !APPLE_CLIENT_ID && (
            <>
              <button
                disabled
                className="w-full py-3.5 px-4 rounded-2xl border border-gray-200 flex items-center justify-center gap-3 opacity-50 cursor-not-allowed"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium text-bloom-text">Continue with Google</span>
              </button>

              <button
                disabled
                className="w-full py-3.5 px-4 rounded-2xl bg-black text-white flex items-center justify-center gap-3 opacity-50 cursor-not-allowed"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span className="font-medium">Continue with Apple</span>
              </button>
            </>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-sm text-bloom-text-muted">or continue with email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Toggle */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 animate-slide-up">
          <button
            onClick={() => { setIsLogin(true); setError('') }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-200 ${
              isLogin ? 'bg-bloom-orange text-white' : 'text-bloom-text-secondary'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError('') }}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-200 ${
              !isLogin ? 'bg-bloom-orange text-white' : 'text-bloom-text-secondary'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 animate-slide-up" style={{ animationDelay: '100ms' }}>
          {!isLogin && (
            <div className="relative">
              <User size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-bloom-text-muted" />
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field pl-12"
                required={!isLogin}
                autoComplete="name"
              />
            </div>
          )}

          <div className="relative">
            <Mail size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-bloom-text-muted" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-field pl-12"
              required
              autoComplete="email"
            />
          </div>

          <div className="relative">
            <Lock size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-bloom-text-muted" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field pl-12"
              required
              minLength={8}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-sm flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button type="submit" isLoading={isLoading}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-bloom-text-muted mt-8">
          By continuing, you agree to Bloom's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
