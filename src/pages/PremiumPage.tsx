import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Crown, Infinity, Zap, Star, Check, Flame, BookOpen,
  CreditCard, Settings, Gift, ChevronDown, ChevronUp,
  Shield, Sparkles, AlertCircle, CheckCircle, RefreshCw,
} from 'lucide-react'
import { api, SubscriptionStatus, SubscriptionPlan } from '../lib/api'
import { useAuth } from '../context/AuthContext'

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const PLANS: Record<SubscriptionPlan, {
  label: string
  price: string
  period: string
  pricePerMonth: string
  badge?: string
}> = {
  yearly: {
    label: 'Annual',
    price: '$149.99',
    period: '/year',
    pricePerMonth: '$12.50/mo',
    badge: 'Best Value — Save 50%',
  },
  monthly: {
    label: 'Monthly',
    price: '$24.99',
    period: '/month',
    pricePerMonth: '$24.99/mo',
  },
}

const FEATURES = [
  {
    icon: Infinity,
    color: 'text-bloom-yellow',
    bg: 'bg-bloom-yellow/10',
    title: 'Unlimited Hearts',
    description: 'Never run out of energy. Learn as much as you want, every single day.',
    free: '5 hearts/day',
    premium: 'Unlimited',
  },
  {
    icon: Flame,
    color: 'text-orange-500',
    bg: 'bg-orange-100',
    title: 'Streak Freeze Protection',
    description: 'Keep your streak safe even on busy days with automatic freeze credits.',
    free: '1 freeze',
    premium: 'Monthly refill',
  },
  {
    icon: Star,
    color: 'text-purple-500',
    bg: 'bg-purple-100',
    title: 'Exclusive Content',
    description: 'Unlock premium-only courses and advanced lesson tracks.',
    free: 'Basic catalog',
    premium: 'Full catalog',
  },
  {
    icon: Zap,
    color: 'text-bloom-green',
    bg: 'bg-bloom-green/10',
    title: 'No Ads',
    description: 'A completely distraction-free learning experience.',
    free: 'With ads',
    premium: 'Ad-free',
  },
  {
    icon: BookOpen,
    color: 'text-blue-500',
    bg: 'bg-blue-100',
    title: 'Advanced Analytics',
    description: 'Deep insights into your learning patterns and progress over time.',
    free: 'Basic stats',
    premium: 'Full analytics',
  },
  {
    icon: Shield,
    color: 'text-indigo-500',
    bg: 'bg-indigo-100',
    title: 'Priority Support',
    description: 'Get help when you need it with faster response times.',
    free: 'Community',
    premium: 'Priority',
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function statusLabel(status: string | null): { label: string; color: string } {
  switch (status) {
    case 'active': return { label: 'Active', color: 'text-green-600 bg-green-100' }
    case 'trialing': return { label: 'Free Trial', color: 'text-blue-600 bg-blue-100' }
    case 'past_due': return { label: 'Past Due', color: 'text-orange-600 bg-orange-100' }
    case 'canceled': return { label: 'Canceled', color: 'text-red-600 bg-red-100' }
    case 'admin_granted': return { label: 'Special Access', color: 'text-purple-600 bg-purple-100' }
    default: return { label: status ?? 'Unknown', color: 'text-gray-600 bg-gray-100' }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SuccessBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="bg-bloom-green/10 border border-bloom-green/30 rounded-2xl p-4 flex items-start gap-3">
      <CheckCircle size={20} className="text-bloom-green flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-bloom-text">Welcome to Bloom Premium! 🎉</p>
        <p className="text-sm text-bloom-text-secondary mt-0.5">
          Your trial has started. Enjoy unlimited learning!
        </p>
      </div>
      <button onClick={onDismiss} className="text-bloom-text-muted hover:text-bloom-text text-lg leading-none">
        ×
      </button>
    </div>
  )
}

function CanceledBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-start gap-3">
      <AlertCircle size={20} className="text-orange-500 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-semibold text-bloom-text">Checkout canceled</p>
        <p className="text-sm text-bloom-text-secondary mt-0.5">
          No worries — you can upgrade anytime below.
        </p>
      </div>
      <button onClick={onDismiss} className="text-bloom-text-muted hover:text-bloom-text text-lg leading-none">
        ×
      </button>
    </div>
  )
}

// Active Premium card
function PremiumActiveCard({
  subscriptionStatus,
  onManageBilling,
  isPortalLoading,
}: {
  subscriptionStatus: SubscriptionStatus
  onManageBilling: () => void
  isPortalLoading: boolean
}) {
  const { label, color } = statusLabel(subscriptionStatus.status)
  const isAdmin = subscriptionStatus.grantedBy === 'admin'

  return (
    <div className="bg-gradient-to-br from-bloom-yellow/20 to-amber-100 border border-bloom-yellow/40 rounded-3xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-bloom-yellow/20 flex items-center justify-center">
            <Crown size={28} className="text-bloom-yellow" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-bloom-text">Bloom Premium</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>
                {label}
              </span>
              {isAdmin && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full text-purple-600 bg-purple-100">
                  <Gift size={10} className="inline mr-1" />
                  Complimentary
                </span>
              )}
            </div>
          </div>
        </div>
        <Sparkles size={24} className="text-bloom-yellow" />
      </div>

      {/* Details */}
      <div className="space-y-2 bg-white/60 rounded-2xl p-4">
        {!isAdmin && subscriptionStatus.plan && (
          <div className="flex justify-between text-sm">
            <span className="text-bloom-text-secondary">Plan</span>
            <span className="font-medium text-bloom-text capitalize">{subscriptionStatus.plan}</span>
          </div>
        )}
        {subscriptionStatus.trialEnd && new Date(subscriptionStatus.trialEnd) > new Date() && (
          <div className="flex justify-between text-sm">
            <span className="text-bloom-text-secondary">Trial ends</span>
            <span className="font-medium text-bloom-text">{formatDate(subscriptionStatus.trialEnd)}</span>
          </div>
        )}
        {!isAdmin && subscriptionStatus.currentPeriodEnd && (
          <div className="flex justify-between text-sm">
            <span className="text-bloom-text-secondary">
              {subscriptionStatus.cancelAtPeriodEnd ? 'Access until' : 'Renews'}
            </span>
            <span className="font-medium text-bloom-text">{formatDate(subscriptionStatus.currentPeriodEnd)}</span>
          </div>
        )}
        {isAdmin && subscriptionStatus.currentPeriodEnd && (
          <div className="flex justify-between text-sm">
            <span className="text-bloom-text-secondary">Access until</span>
            <span className="font-medium text-bloom-text">{formatDate(subscriptionStatus.currentPeriodEnd)}</span>
          </div>
        )}
        {isAdmin && !subscriptionStatus.currentPeriodEnd && (
          <div className="flex justify-between text-sm">
            <span className="text-bloom-text-secondary">Access</span>
            <span className="font-medium text-bloom-text">Lifetime</span>
          </div>
        )}
        {subscriptionStatus.cancelAtPeriodEnd && (
          <p className="text-xs text-orange-600 font-medium pt-1">
            ⚠️ Your subscription will not renew after the current period.
          </p>
        )}
      </div>

      {/* Manage billing button (only for Stripe subs) */}
      {!isAdmin && (
        <button
          onClick={onManageBilling}
          disabled={isPortalLoading}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-2xl border-2 border-bloom-yellow/40 bg-white/70 hover:bg-white text-bloom-text font-semibold transition-all duration-200 disabled:opacity-50"
        >
          {isPortalLoading
            ? <RefreshCw size={16} className="animate-spin" />
            : <Settings size={16} />
          }
          Manage Billing
        </button>
      )}
    </div>
  )
}

// Feature comparison row
function FeatureRow({
  icon: Icon,
  color,
  bg,
  title,
  description,
  free,
  premium,
  isPremium,
}: typeof FEATURES[0] & { isPremium: boolean }) {
  return (
    <div className="flex items-center gap-4 py-3">
      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className={color} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-bloom-text text-sm">{title}</h3>
        <p className="text-xs text-bloom-text-secondary mt-0.5 leading-relaxed">{description}</p>
      </div>
      <div className="text-right flex-shrink-0">
        {isPremium ? (
          <span className="text-xs font-semibold text-bloom-green flex items-center gap-1">
            <Check size={12} strokeWidth={3} />
            {premium}
          </span>
        ) : (
          <span className="text-xs text-bloom-text-muted">{free}</span>
        )}
      </div>
    </div>
  )
}

// Admin panel
function AdminPanel({ userId }: { userId: string }) {
  const [isOpen, setIsOpen] = useState(false)
  const [targetUserId, setTargetUserId] = useState('')
  const [adminKey, setAdminKey] = useState('')
  const [note, setNote] = useState('')
  const [action, setAction] = useState<'grant' | 'revoke'>('grant')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!targetUserId.trim() || !adminKey.trim()) return

    setIsLoading(true)
    setResult(null)

    try {
      if (action === 'grant') {
        await api.adminGrantPremium(targetUserId.trim(), adminKey.trim(), note.trim() || undefined)
        setResult({ type: 'success', message: `✅ Premium granted to user ${targetUserId}` })
      } else {
        await api.adminRevokePremium(targetUserId.trim(), adminKey.trim())
        setResult({ type: 'success', message: `✅ Premium revoked from user ${targetUserId}` })
      }
      setTargetUserId('')
      setNote('')
    } catch (err) {
      setResult({ type: 'error', message: (err as Error).message || 'Failed. Check the admin key and user ID.' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="border border-dashed border-gray-300 rounded-2xl overflow-hidden">
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2 text-bloom-text-secondary">
          <Shield size={16} />
          <span className="text-sm font-medium">Admin Access Controls</span>
        </div>
        {isOpen ? <ChevronUp size={16} className="text-bloom-text-muted" /> : <ChevronDown size={16} className="text-bloom-text-muted" />}
      </button>

      {isOpen && (
        <div className="p-4 pt-0 space-y-4 border-t border-gray-100">
          <p className="text-xs text-bloom-text-muted">
            Grant or revoke Bloom Premium access without a Stripe subscription.
            Requires the admin secret key configured in your server environment.
          </p>

          <div className="text-xs text-bloom-text-secondary bg-gray-50 rounded-xl p-3 font-mono break-all">
            Your user ID: <span className="text-bloom-text font-medium">{userId}</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Action toggle */}
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              <button
                type="button"
                onClick={() => setAction('grant')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  action === 'grant' ? 'bg-bloom-green text-white' : 'bg-white text-bloom-text-secondary hover:bg-gray-50'
                }`}
              >
                Grant Premium
              </button>
              <button
                type="button"
                onClick={() => setAction('revoke')}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${
                  action === 'revoke' ? 'bg-red-500 text-white' : 'bg-white text-bloom-text-secondary hover:bg-gray-50'
                }`}
              >
                Revoke Premium
              </button>
            </div>

            <input
              type="text"
              placeholder="Target user ID (UUID)"
              value={targetUserId}
              onChange={e => setTargetUserId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-bloom-green bg-white font-mono"
              required
            />

            <input
              type="password"
              placeholder="Admin secret key"
              value={adminKey}
              onChange={e => setAdminKey(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-bloom-green bg-white"
              required
            />

            {action === 'grant' && (
              <input
                type="text"
                placeholder="Note (optional)"
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-bloom-green bg-white"
              />
            )}

            {result && (
              <p className={`text-xs font-medium px-3 py-2 rounded-xl ${
                result.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
              }`}>
                {result.message}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading || !targetUserId.trim() || !adminKey.trim()}
              className={`w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                action === 'grant' ? 'bg-bloom-green hover:bg-bloom-green/90' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isLoading
                ? 'Processing…'
                : action === 'grant'
                ? 'Grant Premium Access'
                : 'Revoke Premium Access'
              }
            </button>
          </form>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PremiumPage() {
  const { user, refreshStats } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()

  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('yearly')
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [isStatusLoading, setIsStatusLoading] = useState(true)
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false)
  const [isPortalLoading, setIsPortalLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const showSuccess = searchParams.get('success') === 'true'
  const showCanceled = searchParams.get('canceled') === 'true'

  const fetchStatus = useCallback(async () => {
    try {
      setIsStatusLoading(true)
      const res = await api.getSubscriptionStatus()
      setSubscriptionStatus(res.status)
    } catch {
      // Subscription status may not be available (e.g. not logged in)
    } finally {
      setIsStatusLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // After a successful checkout, refresh user data + subscription status
  useEffect(() => {
    if (showSuccess) {
      refreshStats()
      fetchStatus()
    }
  }, [showSuccess, refreshStats, fetchStatus])

  function dismissBanner() {
    setSearchParams({}, { replace: true })
  }

  async function handleCheckout() {
    setError(null)
    setIsCheckoutLoading(true)
    try {
      const res = await api.createCheckoutSession(selectedPlan)
      window.location.href = res.url
    } catch (err) {
      setError((err as Error).message || 'Failed to start checkout. Please try again.')
    } finally {
      setIsCheckoutLoading(false)
    }
  }

  async function handleManageBilling() {
    setError(null)
    setIsPortalLoading(true)
    try {
      const res = await api.createPortalSession()
      window.location.href = res.url
    } catch (err) {
      setError((err as Error).message || 'Failed to open billing portal. Please try again.')
    } finally {
      setIsPortalLoading(false)
    }
  }

  const isPremium = user?.isPremium ?? subscriptionStatus?.isPremium ?? false
  
  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in pb-8">

      {/* Success / Cancel Banners */}
      {showSuccess && <SuccessBanner onDismiss={dismissBanner} />}
      {showCanceled && <CanceledBanner onDismiss={dismissBanner} />}

      {/* Header */}
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 ${
          isPremium ? 'bg-bloom-yellow/20' : 'bg-bloom-yellow/10'
        }`}>
          <Crown size={48} className="text-bloom-yellow" />
        </div>
        <h1 className="text-3xl font-bold text-bloom-text">
          {isPremium ? 'You\'re Premium! 👑' : 'Bloom Premium'}
        </h1>
        <p className="text-bloom-text-secondary mt-2">
          {isPremium
            ? 'Enjoy unlimited learning with all premium benefits.'
            : 'Unlock the full Bloom experience'}
        </p>
      </div>
      
      {/* Loading skeleton */}
      {isStatusLoading && (
        <div className="bg-white rounded-3xl shadow-bloom p-6 space-y-3 animate-pulse">
          <div className="h-4 bg-gray-200 rounded-full w-3/4" />
          <div className="h-4 bg-gray-200 rounded-full w-1/2" />
          <div className="h-4 bg-gray-200 rounded-full w-2/3" />
            </div>
      )}

      {/* Active Premium Status Card */}
      {!isStatusLoading && isPremium && subscriptionStatus && (
        <PremiumActiveCard
          subscriptionStatus={subscriptionStatus}
          onManageBilling={handleManageBilling}
          isPortalLoading={isPortalLoading}
        />
      )}

      {/* Feature List */}
      <div className="bg-white rounded-3xl shadow-bloom divide-y divide-gray-100 px-6">
        {FEATURES.map((feature, i) => (
          <FeatureRow key={i} {...feature} isPremium={isPremium} />
        ))}
      </div>
      
      {/* Plan Selection + CTA (only shown if not premium) */}
      {!isPremium && (
        <>
          {/* Plan cards */}
      <div className="space-y-3">
            <h2 className="font-bold text-bloom-text text-lg">Choose your plan</h2>
            {(Object.keys(PLANS) as SubscriptionPlan[]).map((plan) => {
              const p = PLANS[plan]
              const isSelected = selectedPlan === plan
              return (
          <button
            key={plan}
            onClick={() => setSelectedPlan(plan)}
                  className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 relative ${
                    isSelected
                      ? 'border-bloom-yellow bg-bloom-yellow/5 shadow-sm'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
                  {p.badge && (
                    <span className="absolute -top-2.5 left-4 px-3 py-0.5 rounded-full bg-bloom-green text-white text-xs font-bold">
                      {p.badge}
                    </span>
                  )}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-bloom-text">{p.label}</span>
                </div>
                      <p className="text-bloom-text font-bold text-xl mt-1">
                        {p.price}
                        <span className="text-sm font-normal text-bloom-text-secondary">{p.period}</span>
                </p>
                      <p className="text-xs text-bloom-text-muted">{p.pricePerMonth}</p>
              </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'border-bloom-yellow bg-bloom-yellow' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
            </div>
          </button>
              )
            })}
      </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl p-4">
              <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
      
      {/* CTA */}
      <div className="space-y-3">
            <button
              onClick={handleCheckout}
              disabled={isCheckoutLoading}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-bloom-yellow text-white font-bold text-lg shadow-md hover:bg-bloom-yellow/90 active:scale-95 transition-all duration-200 disabled:opacity-60"
            >
              {isCheckoutLoading
                ? <><RefreshCw size={20} className="animate-spin" /> Starting…</>
                : <><CreditCard size={20} /> Start 7-Day Free Trial</>
              }
            </button>
            <p className="text-center text-xs text-bloom-text-muted">
              7-day free trial, then {PLANS[selectedPlan].price}{PLANS[selectedPlan].period}. Cancel anytime.
              No charge during trial.
        </p>
      </div>
        </>
      )}

      {/* Comparison: Free vs Premium header (always visible) */}
      {!isPremium && (
        <div className="bg-white rounded-3xl shadow-bloom p-5">
          <h3 className="font-bold text-bloom-text mb-4 flex items-center gap-2">
            <Sparkles size={18} className="text-bloom-yellow" />
            Free vs Premium
          </h3>
          <div className="grid grid-cols-3 gap-2 text-xs font-semibold text-bloom-text-secondary mb-3">
            <span>Feature</span>
            <span className="text-center">Free</span>
            <span className="text-center text-bloom-yellow">Premium</span>
          </div>
          {FEATURES.map((f, i) => (
            <div key={i} className="grid grid-cols-3 gap-2 py-2.5 border-t border-gray-50 text-xs">
              <span className="text-bloom-text font-medium">{f.title}</span>
              <span className="text-center text-bloom-text-muted">{f.free}</span>
              <span className="text-center text-bloom-green font-semibold">{f.premium}</span>
            </div>
          ))}
        </div>
      )}

      {/* Admin Panel */}
      {user && <AdminPanel userId={user.id} />}

    </div>
  )
}
