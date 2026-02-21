import { useState } from 'react'
import { Crown, Infinity, Zap, Download, Star, Check } from 'lucide-react'
import Button from '../components/Button'

type PlanType = 'monthly' | 'yearly'

const plans = {
  monthly: { price: '$24.99', period: '/month', savings: '' },
  yearly: { price: '$149.99', period: '/year', savings: 'Save 50%' },
}

const features = [
  { icon: Infinity, title: 'Unlimited lessons', description: 'Learn as much as you want, every day' },
  { icon: Zap, title: 'Unlimited energy', description: 'No waiting for energy to refill' },
  { icon: Download, title: 'Offline access', description: 'Download lessons for offline learning' },
  { icon: Star, title: 'Exclusive content', description: 'Access premium-only courses' },
]

export default function PremiumPage() {
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('yearly')
  
  return (
    <div className="max-w-lg mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-bloom-yellow/15 mb-4">
          <Crown size={48} className="text-bloom-yellow" />
        </div>
        <h1 className="text-3xl font-bold text-bloom-text">Bloom Premium</h1>
        <p className="text-bloom-text-secondary mt-2">Unlock unlimited learning</p>
      </div>
      
      {/* Features */}
      <div className="bg-white rounded-3xl shadow-bloom p-6 space-y-5">
        {features.map((feature, index) => (
          <div key={index} className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-bloom-yellow/15 flex items-center justify-center flex-shrink-0">
              <feature.icon size={20} className="text-bloom-yellow" />
            </div>
            <div>
              <h3 className="font-semibold text-bloom-text">{feature.title}</h3>
              <p className="text-sm text-bloom-text-secondary">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
      
      {/* Plan Selection */}
      <div className="space-y-3">
        {(Object.keys(plans) as PlanType[]).map((plan) => (
          <button
            key={plan}
            onClick={() => setSelectedPlan(plan)}
            className={`w-full p-5 rounded-2xl border-2 text-left transition-all duration-200 ${
              selectedPlan === plan 
                ? 'border-bloom-yellow bg-bloom-yellow/5' 
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-bloom-text capitalize">{plan}</span>
                  {plans[plan].savings && (
                    <span className="px-2 py-0.5 rounded-full bg-bloom-green text-white text-xs font-medium">
                      {plans[plan].savings}
                    </span>
                  )}
                </div>
                <p className="text-sm text-bloom-text-secondary mt-1">
                  {plans[plan].price}{plans[plan].period}
                </p>
              </div>
              
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                selectedPlan === plan 
                  ? 'border-bloom-yellow bg-bloom-yellow' 
                  : 'border-gray-300'
              }`}>
                {selectedPlan === plan && (
                  <Check size={14} className="text-white" strokeWidth={3} />
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      
      {/* CTA */}
      <div className="space-y-3">
        <Button color="yellow">
          Start Free Trial
        </Button>
        <p className="text-center text-sm text-bloom-text-muted">
          7-day free trial, then {plans[selectedPlan].price}{plans[selectedPlan].period}. Cancel anytime.
        </p>
      </div>
    </div>
  )
}
