import { Outlet, NavLink } from 'react-router-dom'
import { Home, BookOpen, Crown, User, Hammer, Flame, Heart, Star } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Layout() {
  const { stats } = useAuth()

  const streak = stats?.streak?.currentStreak ?? 0
  const energy = stats?.energy ?? 5
  const energyMax = stats?.energyMax ?? 5
  const xp = stats?.xp ?? 0
  const level = stats?.level ?? 1
  const xpCurrent = stats?.xpForCurrentLevel ?? 0
  const xpNext = stats?.xpForNextLevel ?? 100
  const xpIntoLevel = xp - xpCurrent
  const xpNeeded = xpNext - xpCurrent
  const levelPct = xpNeeded > 0 ? Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100)) : 0

  return (
    <div className="min-h-screen bg-bloom-bg">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-bloom-orange flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="font-bold text-xl text-bloom-text hidden sm:block">Bloom</span>
          </div>

          {/* XP level bar — center */}
          <div className="flex-1 max-w-[200px] hidden sm:block">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Star size={11} className="text-amber-400 fill-amber-400 flex-shrink-0" />
              <span className="text-[10px] font-bold text-bloom-text-secondary">
                LVL {level}
              </span>
              <span className="text-[10px] text-bloom-text-muted ml-auto">
                {xpIntoLevel}/{xpNeeded} XP
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-700"
                style={{ width: `${levelPct}%` }}
              />
            </div>
          </div>

          {/* Right stats */}
          <div className="flex items-center gap-2">
            {/* Streak */}
            <StreakBadge streak={streak} />

            {/* Hearts / Energy */}
            <EnergyBadge energy={energy} energyMax={energyMax} />
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Outlet />
      </main>

      {/* ── Bottom Navigation ── */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            <NavItem to="/" icon={Home} label="Home" />
            <NavItem to="/courses" icon={BookOpen} label="Courses" />
            <NavItem to="/workshop" icon={Hammer} label="Workshop" />
            <NavItem to="/premium" icon={Crown} label="Premium" />
            <NavItem to="/profile" icon={User} label="You" />
          </div>
        </div>
      </nav>
    </div>
  )
}

// ── Streak Badge ────────────────────────────────────────────────────────────

function StreakBadge({ streak }: { streak: number }) {
  const isActive = streak > 0
  return (
    <div
      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl border transition-colors ${
        isActive
          ? 'bg-orange-50 border-orange-200'
          : 'bg-gray-50 border-gray-200'
      }`}
    >
      <Flame
        size={16}
        className={isActive ? 'text-orange-500' : 'text-gray-300'}
        fill={isActive ? 'currentColor' : 'none'}
        strokeWidth={isActive ? 0 : 2}
      />
      <span
        className={`text-sm font-bold tabular-nums ${
          isActive ? 'text-orange-600' : 'text-gray-400'
        }`}
      >
        {streak}
      </span>
    </div>
  )
}

// ── Energy / Hearts Badge ────────────────────────────────────────────────────

function EnergyBadge({ energy, energyMax }: { energy: number; energyMax: number }) {
  return (
    <div className="flex items-center gap-0.5 px-2.5 py-1.5 rounded-xl border bg-red-50 border-red-100">
      {Array.from({ length: energyMax }).map((_, i) => (
        <Heart
          key={i}
          size={14}
          className={i < energy ? 'text-red-500' : 'text-red-200'}
          fill={i < energy ? 'currentColor' : 'none'}
          strokeWidth={i < energy ? 0 : 1.5}
        />
      ))}
    </div>
  )
}

// ── Nav Item ─────────────────────────────────────────────────────────────────

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
          isActive
            ? 'text-bloom-text bg-gray-100'
            : 'text-bloom-text-muted hover:text-bloom-text-secondary'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
          <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
        </>
      )}
    </NavLink>
  )
}
