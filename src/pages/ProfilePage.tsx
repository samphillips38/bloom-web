import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { api, Achievement } from '../lib/api'
import {
  Flame, BookOpen, Star, Bell,
  Globe, HelpCircle, FileText, LogOut, Crown, ChevronRight,
  Heart, Zap, Shield, Trophy, Lock, Check, ChevronDown, ChevronUp,
  Clock,
} from 'lucide-react'
import Card from '../components/Card'

// ─────────────────────────────────────────────────────────────────────────────
// XP Level Bar
// ─────────────────────────────────────────────────────────────────────────────

function XPLevelBar({
  xp, level, xpForCurrentLevel, xpForNextLevel,
}: {
  xp: number; level: number; xpForCurrentLevel: number; xpForNextLevel: number
}) {
  const into = xp - xpForCurrentLevel
  const needed = xpForNextLevel - xpForCurrentLevel
  const pct = needed > 0 ? Math.min(100, Math.round((into / needed) * 100)) : 100

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
            <Star size={20} className="text-white" fill="white" />
          </div>
          <div>
            <p className="text-xs text-bloom-text-secondary font-medium">Current level</p>
            <p className="text-xl font-bold text-bloom-text">Level {level}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-amber-500">{xp.toLocaleString()}</p>
          <p className="text-xs text-bloom-text-muted">total XP</p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-bloom-text-secondary">
          <span>{into.toLocaleString()} XP into level</span>
          <span>{needed.toLocaleString()} XP to level {level + 1}</span>
        </div>
        <div className="h-3 rounded-full bg-amber-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="text-xs text-bloom-text-muted text-right">{pct}% to Level {level + 1}</p>
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Streak Calendar (last 14 days)
// ─────────────────────────────────────────────────────────────────────────────

function StreakCalendar({
  streak, lastActivityDate,
}: {
  streak: number; lastActivityDate: string | null
}) {
  // Build a 14-day window ending today
  const days: { date: string; label: string; active: boolean; isToday: boolean }[] = []
  const today = new Date()

  // We'll mark "active" = last `streak` consecutive days including today (or yesterday)
  // If lastActivityDate is today, streak is current.
  const lastDate = lastActivityDate ? new Date(lastActivityDate + 'T12:00:00') : null
  const todayStr = today.toISOString().split('T')[0]
  const lastStr = lastDate ? lastDate.toISOString().split('T')[0] : null

  // Determine if streak is still alive
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const streakAlive = lastStr === todayStr || lastStr === yesterdayStr

  for (let i = 13; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dStr = d.toISOString().split('T')[0]
    const isToday = dStr === todayStr

    // A day is "active" if it falls within the current streak window
    let active = false
    if (streakAlive && streak > 0 && lastStr) {
      const referenceDate = lastStr === todayStr ? today : yesterday
      const diff = Math.round((referenceDate.getTime() - d.getTime()) / 86400000)
      active = diff >= 0 && diff < streak
    }

    days.push({
      date: dStr,
      label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()],
      active,
      isToday,
    })
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame size={20} className="text-orange-500" fill="currentColor" />
          <h3 className="font-bold text-bloom-text">Daily Streak</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-2xl font-black text-orange-500">{streak}</span>
          <span className="text-sm text-bloom-text-secondary">days</span>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-3">
        {days.slice(0, 7).map((day) => (
          <CalendarDay key={day.date} day={day} />
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.slice(7, 14).map((day) => (
          <CalendarDay key={day.date} day={day} />
        ))}
      </div>

      {streak === 0 && (
        <p className="text-xs text-bloom-text-muted text-center mt-3">
          Complete a lesson today to start your streak! 🔥
        </p>
      )}
      {streak > 0 && (
        <p className="text-xs text-bloom-text-secondary text-center mt-3">
          {streak >= 7
            ? `🔥 Amazing! ${streak}-day streak!`
            : `Keep it up! ${streak} day${streak === 1 ? '' : 's'} and counting.`}
        </p>
      )}
    </Card>
  )
}

function CalendarDay({
  day,
}: {
  day: { label: string; active: boolean; isToday: boolean }
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] text-bloom-text-muted font-medium">{day.label}</span>
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
          day.active
            ? 'bg-orange-500 shadow-sm'
            : day.isToday
            ? 'bg-orange-100 border border-orange-300'
            : 'bg-gray-100'
        }`}
      >
        {day.active ? (
          <Flame size={13} className="text-white" fill="white" />
        ) : (
          <div className={`w-2 h-2 rounded-full ${day.isToday ? 'bg-orange-300' : 'bg-gray-300'}`} />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Energy Panel
// ─────────────────────────────────────────────────────────────────────────────

function EnergyPanel({
  energy, energyMax, msUntilNext, streakFreezes,
}: {
  energy: number; energyMax: number; msUntilNext: number; streakFreezes: number
}) {
  const [countdown, setCountdown] = useState(msUntilNext)

  useEffect(() => {
    if (msUntilNext <= 0 || energy >= energyMax) return
    setCountdown(msUntilNext)
    const interval = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [msUntilNext, energy, energyMax])

  const hours = Math.floor(countdown / 3600000)
  const minutes = Math.floor((countdown % 3600000) / 60000)
  const seconds = Math.floor((countdown % 60000) / 1000)
  const timeStr = `${hours > 0 ? `${hours}h ` : ''}${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Heart size={20} className="text-red-500" fill="currentColor" />
          <h3 className="font-bold text-bloom-text">Hearts</h3>
        </div>
        <span className="text-sm text-bloom-text-secondary">{energy}/{energyMax}</span>
      </div>

      {/* Heart icons */}
      <div className="flex gap-2 mb-4">
        {Array.from({ length: energyMax }).map((_, i) => (
          <Heart
            key={i}
            size={28}
            className={i < energy ? 'text-red-500' : 'text-red-100'}
            fill={i < energy ? 'currentColor' : 'none'}
            strokeWidth={i < energy ? 0 : 1.5}
          />
        ))}
      </div>

      {energy < energyMax && countdown > 0 && (
        <div className="flex items-center gap-2 text-sm text-bloom-text-secondary bg-red-50 rounded-xl px-3 py-2 mb-3">
          <Clock size={14} className="text-red-400 flex-shrink-0" />
          <span>Next heart in <span className="font-bold text-red-500">{timeStr}</span></span>
        </div>
      )}

      {energy >= energyMax && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-xl px-3 py-2 mb-3">
          <Check size={14} />
          <span className="font-medium">Full hearts — you're ready to learn!</span>
        </div>
      )}

      {/* Streak freeze */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-indigo-500" />
          <span className="text-sm font-medium text-bloom-text">Streak Freezes</span>
        </div>
        <span className="text-sm font-bold text-indigo-600">{streakFreezes} available</span>
      </div>
      <p className="text-xs text-bloom-text-muted mt-1">
        A streak freeze protects your streak for one missed day.
      </p>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Achievements Grid
// ─────────────────────────────────────────────────────────────────────────────

const ALL_ACHIEVEMENTS = [
  { id: 'first_bloom',   title: 'First Bloom',    description: 'Complete your first lesson',    emoji: '🌱' },
  { id: 'streak_3',      title: 'Warming Up',      description: 'Reach a 3-day streak',          emoji: '🔥' },
  { id: 'streak_7',      title: 'On Fire',         description: 'Reach a 7-day streak',          emoji: '🔥' },
  { id: 'streak_14',     title: 'Blazing',         description: 'Reach a 14-day streak',         emoji: '⚡' },
  { id: 'streak_30',     title: 'Dedicated',       description: 'Reach a 30-day streak',         emoji: '💪' },
  { id: 'streak_100',    title: 'Legend',          description: 'Reach a 100-day streak',        emoji: '🏆' },
  { id: 'lessons_10',    title: 'Scholar',         description: 'Complete 10 lessons',           emoji: '📚' },
  { id: 'lessons_50',    title: 'Expert',          description: 'Complete 50 lessons',           emoji: '🎓' },
  { id: 'lessons_100',   title: 'Master',          description: 'Complete 100 lessons',          emoji: '🌟' },
  { id: 'perfect_score', title: 'Perfectionist',   description: 'Get 100% on a quiz',            emoji: '⭐' },
  { id: 'level_5',       title: 'Apprentice',      description: 'Reach level 5',                 emoji: '📈' },
  { id: 'level_10',      title: 'Journeyman',      description: 'Reach level 10',                emoji: '🚀' },
  { id: 'level_20',      title: 'Expert Learner',  description: 'Reach level 20',                emoji: '🌠' },
  { id: 'daily_3',       title: 'Power Session',   description: 'Complete 3 lessons in one day', emoji: '💥' },
]

function AchievementsSection({ earnedAchievements }: { earnedAchievements: Achievement[] }) {
  const [expanded, setExpanded] = useState(false)
  const earnedIds = new Set(earnedAchievements.map(a => a.id))
  const earnedCount = earnedAchievements.length
  const totalCount = ALL_ACHIEVEMENTS.length

  const visible = expanded ? ALL_ACHIEVEMENTS : ALL_ACHIEVEMENTS.slice(0, 8)

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy size={20} className="text-amber-500" />
          <h3 className="font-bold text-bloom-text">Achievements</h3>
        </div>
        <span className="text-sm font-bold text-amber-600">
          {earnedCount}/{totalCount}
        </span>
      </div>

      {/* Mini progress bar */}
      <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden mb-4">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-400"
          style={{ width: `${totalCount > 0 ? (earnedCount / totalCount) * 100 : 0}%` }}
        />
      </div>

      <div className="grid grid-cols-4 gap-2">
        {visible.map(ach => {
          const earned = earnedIds.has(ach.id)
          return (
            <div
              key={ach.id}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                earned ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-transparent'
              }`}
              title={`${ach.title}: ${ach.description}`}
            >
              <div
                className={`text-2xl ${earned ? '' : 'grayscale opacity-30'}`}
              >
                {ach.emoji}
              </div>
              <span
                className={`text-[9px] font-semibold text-center leading-tight ${
                  earned ? 'text-amber-700' : 'text-bloom-text-muted'
                }`}
              >
                {ach.title}
              </span>
              {!earned && (
                <Lock size={8} className="text-gray-300" />
              )}
            </div>
          )
        })}
      </div>

      {ALL_ACHIEVEMENTS.length > 8 && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1 mt-3 text-xs font-medium text-bloom-text-secondary hover:text-bloom-orange transition-colors"
        >
          {expanded ? (
            <><ChevronUp size={14} /> Show less</>
          ) : (
            <><ChevronDown size={14} /> Show all {ALL_ACHIEVEMENTS.length} achievements</>
          )}
        </button>
      )}
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Daily Goal Selector
// ─────────────────────────────────────────────────────────────────────────────

function DailyGoalCard({
  current, onChange,
}: {
  current: number; onChange: (goal: number) => void
}) {
  const options = [1, 2, 3, 5]
  const labels: Record<number, string> = {
    1: 'Casual',
    2: 'Regular',
    3: 'Serious',
    5: 'Intense',
  }

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap size={20} className="text-bloom-orange" />
        <h3 className="font-bold text-bloom-text">Daily Goal</h3>
      </div>
      <p className="text-sm text-bloom-text-secondary mb-4">
        How many lessons do you want to complete each day?
      </p>
      <div className="grid grid-cols-4 gap-2">
        {options.map(opt => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={`flex flex-col items-center py-3 rounded-xl border-2 transition-all font-medium ${
              current === opt
                ? 'border-bloom-orange bg-bloom-orange/5 text-bloom-orange'
                : 'border-gray-200 text-bloom-text-secondary hover:border-gray-300'
            }`}
          >
            <span className="text-lg font-black">{opt}</span>
            <span className="text-[10px]">{labels[opt]}</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Profile Page
// ─────────────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { user, stats, logout, setDailyGoal } = useAuth()
  const [achievements, setAchievements] = useState<Achievement[]>(stats?.achievements ?? [])
  const [localGoal, setLocalGoal] = useState(stats?.dailyGoal ?? 1)

  // Load achievements separately for the full list
  useEffect(() => {
    api.getAchievements()
      .then(r => setAchievements(r.achievements))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (stats?.achievements) setAchievements(stats.achievements)
  }, [stats?.achievements])

  useEffect(() => {
    if (stats?.dailyGoal) setLocalGoal(stats.dailyGoal)
  }, [stats?.dailyGoal])

  async function handleGoalChange(goal: number) {
    setLocalGoal(goal)
    try {
      await setDailyGoal(goal)
    } catch {
      // revert on error
      setLocalGoal(stats?.dailyGoal ?? 1)
    }
  }

  const initials = user?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'B'

  const streak = stats?.streak?.currentStreak ?? 0
  const lastActivity = stats?.streak?.lastActivityDate ?? null

  const settingsItems = [
    { icon: Bell, label: 'Notifications', color: '#FF6B35' },
    { icon: Globe, label: 'Language', color: '#4CAF50' },
    { icon: HelpCircle, label: 'Help & Support', color: '#9B59B6' },
    { icon: FileText, label: 'Terms & Privacy', color: '#6B7280' },
  ]

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in pb-4">

      {/* ── Profile Header ── */}
      <div className="text-center pt-2">
        <div className="w-20 h-20 mx-auto rounded-full bg-bloom-orange/15 flex items-center justify-center mb-3">
          <span className="text-3xl font-bold text-bloom-orange">{initials}</span>
        </div>
        <h1 className="text-xl font-bold text-bloom-text">{user?.name}</h1>
        <p className="text-sm text-bloom-text-secondary">{user?.email}</p>
        {user?.isPremium && (
          <span className="inline-flex items-center gap-1.5 mt-2 px-4 py-1.5 rounded-full bg-bloom-yellow/15 text-bloom-yellow font-medium text-sm">
            <Crown size={14} />
            Premium
          </span>
        )}
      </div>

      {/* ── Quick Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        <MiniStatCard value={streak} label="Day Streak" icon={Flame} color="#FF6B35" />
        <MiniStatCard value={stats?.completedLessons ?? 0} label="Lessons" icon={BookOpen} color="#4A90D9" />
        <MiniStatCard value={stats?.xp ?? 0} label="Total XP" icon={Star} color="#FFB800" />
      </div>

      {/* ── XP Level Bar ── */}
      {stats && (
        <XPLevelBar
          xp={stats.xp}
          level={stats.level}
          xpForCurrentLevel={stats.xpForCurrentLevel}
          xpForNextLevel={stats.xpForNextLevel}
        />
      )}

      {/* ── Streak Calendar ── */}
      <StreakCalendar streak={streak} lastActivityDate={lastActivity} />

      {/* ── Energy / Hearts ── */}
      <EnergyPanel
        energy={stats?.energy ?? 5}
        energyMax={stats?.energyMax ?? 5}
        msUntilNext={stats?.msUntilNextEnergyRefill ?? 0}
        streakFreezes={stats?.streakFreezes ?? 1}
      />

      {/* ── Achievements ── */}
      <AchievementsSection earnedAchievements={achievements} />

      {/* ── Daily Goal ── */}
      <DailyGoalCard current={localGoal} onChange={handleGoalChange} />

      {/* ── Settings ── */}
      <Card className="p-0 overflow-hidden">
        {settingsItems.map((item, index) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors ${
              index !== 0 ? 'border-t border-gray-100' : ''
            }`}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${item.color}18` }}
            >
              <item.icon size={18} style={{ color: item.color }} />
            </div>
            <span className="flex-1 text-left font-medium text-bloom-text text-sm">{item.label}</span>
            <ChevronRight size={18} className="text-bloom-text-muted" />
          </button>
        ))}
      </Card>

      {/* ── Logout ── */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut size={18} />
        <span className="font-medium">Log Out</span>
      </button>
    </div>
  )
}

function MiniStatCard({
  value, label, icon: Icon, color,
}: {
  value: number; label: string; icon: React.ElementType; color: string
}) {
  return (
    <Card className="text-center py-4">
      <Icon size={22} style={{ color }} className="mx-auto mb-1.5" />
      <div className="text-xl font-black text-bloom-text">{value.toLocaleString()}</div>
      <div className="text-xs text-bloom-text-secondary">{label}</div>
    </Card>
  )
}

