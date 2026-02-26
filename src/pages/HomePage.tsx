import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Brain,
  BookOpen,
  Compass,
  ChevronRight,
  Bookmark,
  BookmarkX,
  Sparkles,
  Trophy,
  ArrowRight,
  Check,
} from 'lucide-react'
import { api, LibraryItem } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import Card from '../components/Card'

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function getGreeting(name?: string): string {
  const hour = new Date().getHours()
  const part =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  return name ? `${part}, ${name.split(' ')[0]}` : part
}

function getCurrentItem(items: LibraryItem[]): LibraryItem | null {
  // The "currently active" item: has recent activity, isn't fully completed
  const active = items
    .filter((i) => !i.isCompleted && i.lastActivityAt)
    .sort(
      (a, b) =>
        new Date(b.lastActivityAt!).getTime() -
        new Date(a.lastActivityAt!).getTime()
    )
  if (active.length > 0) return active[0]

  // Fall back to most recently saved item that isn't completed
  const unstarted = items
    .filter((i) => !i.isCompleted)
    .sort(
      (a, b) =>
        new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    )
  return unstarted[0] ?? null
}

function itemTitle(item: LibraryItem) {
  return item.type === 'course' ? item.courseTitle : item.lessonTitle
}

function itemThemeColor(item: LibraryItem) {
  return (
    (item.type === 'course' ? item.courseThemeColor : item.lessonThemeColor) ??
    '#FF6B35'
  )
}

function itemDescription(item: LibraryItem) {
  return item.type === 'course'
    ? item.courseDescription
    : item.lessonDescription
}

function itemTotalLabel(item: LibraryItem) {
  if (item.type === 'course') {
    return `${item.totalCount} lesson${item.totalCount !== 1 ? 's' : ''}`
  }
  return `${item.totalCount} page${item.totalCount !== 1 ? 's' : ''}`
}

function navigateTo(item: LibraryItem, navigate: ReturnType<typeof useNavigate>) {
  if (item.type === 'course' && item.courseId) {
    navigate(`/courses/${item.courseId}`)
  } else if (item.type === 'lesson' && item.lessonId) {
    navigate(`/lesson/${item.lessonId}/overview`)
  }
}

// ─────────────────────────────────────────────────────────────
//  Progress ring (SVG)
// ─────────────────────────────────────────────────────────────

function ProgressRing({
  percent,
  color,
  size = 56,
  stroke = 4,
}: {
  percent: number
  color: string
  size?: number
  stroke?: number
}) {
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference - (percent / 100) * circumference

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={`${color}20`}
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────
//  Currently Learning Hero Card
// ─────────────────────────────────────────────────────────────

function CurrentlyLearningCard({
  item,
  onRemove,
  navigate,
}: {
  item: LibraryItem
  onRemove: (item: LibraryItem) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const color = itemThemeColor(item)
  const title = itemTitle(item) ?? 'Untitled'
  const desc = itemDescription(item)
  const percent = item.progressPercent
  const isStarted = item.completedCount > 0

  const continueLabelText = item.isCompleted
    ? 'Replay'
    : isStarted
    ? 'Continue'
    : 'Start Learning'

  return (
    <div
      className="relative rounded-3xl overflow-hidden cursor-pointer group"
      style={{
        background: `linear-gradient(135deg, ${color}18 0%, ${color}08 60%, transparent 100%)`,
        border: `1.5px solid ${color}25`,
      }}
      onClick={() => navigateTo(item, navigate)}
    >
      {/* Remove from library button */}
      <button
        className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/70 backdrop-blur-sm text-bloom-text-muted hover:text-red-400 hover:bg-white transition-all opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item)
        }}
        title="Remove from library"
      >
        <BookmarkX size={16} />
      </button>

      <div className="p-6">
        {/* Badge */}
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide mb-4"
          style={{ backgroundColor: `${color}18`, color }}
        >
          <Sparkles size={11} />
          {isStarted ? 'CONTINUE LEARNING' : 'START LEARNING'}
        </span>

        {/* Title */}
        <h2 className="text-xl font-bold text-bloom-text leading-snug mb-1">
          {title}
        </h2>
        {desc && (
          <p className="text-sm text-bloom-text-secondary line-clamp-2 mb-4">
            {desc}
          </p>
        )}

        {/* Progress section */}
        <div className="mb-5">
          {/* Progress bar */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-bloom-text-secondary font-medium">
              {item.completedCount} of {item.totalCount} {item.type === 'course' ? 'lessons' : 'pages'}
            </span>
            <span className="text-xs font-bold" style={{ color }}>
              {percent}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-black/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${percent}%`,
                background: `linear-gradient(90deg, ${color}cc, ${color})`,
              }}
            />
          </div>
        </div>

        {/* CTA */}
        <button
          className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl font-semibold text-white text-sm transition-all active:scale-95"
          style={{ backgroundColor: color }}
          onClick={(e) => {
            e.stopPropagation()
            navigateTo(item, navigate)
          }}
        >
          {continueLabelText}
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Library Grid Card
// ─────────────────────────────────────────────────────────────

function LibraryCard({
  item,
  isCurrent,
  onRemove,
  navigate,
}: {
  item: LibraryItem
  isCurrent: boolean
  onRemove: (item: LibraryItem) => void
  navigate: ReturnType<typeof useNavigate>
}) {
  const color = itemThemeColor(item)
  const title = itemTitle(item) ?? 'Untitled'
  const percent = item.progressPercent

  return (
    <div
      className="relative rounded-2xl overflow-hidden cursor-pointer group active:scale-95 transition-transform"
      style={{
        background: `linear-gradient(145deg, ${color}14 0%, ${color}06 100%)`,
        border: `1.5px solid ${color}20`,
      }}
      onClick={() => navigateTo(item, navigate)}
    >
      {/* Remove button */}
      <button
        className="absolute top-2.5 right-2.5 z-10 p-1 rounded-full bg-white/70 backdrop-blur-sm text-bloom-text-muted hover:text-red-400 hover:bg-white transition-all opacity-0 group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation()
          onRemove(item)
        }}
        title="Remove from library"
      >
        <BookmarkX size={13} />
      </button>

      <div className="p-4">
        {/* Icon + ring */}
        <div className="relative w-14 h-14 mb-3">
          <ProgressRing percent={percent} color={color} size={56} stroke={4} />
          <div
            className="absolute inset-1.5 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${color}18` }}
          >
            {item.isCompleted ? (
              <Check size={18} style={{ color }} strokeWidth={2.5} />
            ) : (
              <Brain size={18} style={{ color }} />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-bloom-text text-sm leading-tight line-clamp-2 mb-1">
          {title}
        </h3>

        {/* Meta */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-bloom-text-muted">
            {itemTotalLabel(item)}
          </span>
          <span
            className="text-xs font-bold"
            style={{ color: item.isCompleted ? color : `${color}cc` }}
          >
            {item.isCompleted ? '✓ Done' : `${percent}%`}
          </span>
        </div>

        {/* "Currently learning" indicator */}
        {isCurrent && !item.isCompleted && (
          <div
            className="mt-2 flex items-center gap-1 px-2 py-0.5 rounded-full w-fit"
            style={{ backgroundColor: `${color}18` }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-medium" style={{ color }}>
              Active
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Empty State
// ─────────────────────────────────────────────────────────────

function EmptyLibrary({ navigate }: { navigate: ReturnType<typeof useNavigate> }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-bloom-orange/15 to-bloom-orange/5 flex items-center justify-center mx-auto mb-5">
        <Bookmark size={36} className="text-bloom-orange/60" />
      </div>
      <h3 className="text-lg font-bold text-bloom-text mb-2">
        Your library is empty
      </h3>
      <p className="text-sm text-bloom-text-secondary mb-6 max-w-xs mx-auto">
        Save courses and lessons you want to learn. They'll appear here so you
        can pick up where you left off.
      </p>
      <button
        onClick={() => navigate('/courses')}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-bloom-orange text-white font-semibold text-sm hover:opacity-90 transition-opacity active:scale-95"
      >
        <Compass size={16} />
        Discover Lessons
      </button>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
//  Main Page
// ─────────────────────────────────────────────────────────────

export default function HomePage() {
  const navigate = useNavigate()
  const { user, stats } = useAuth()

  const [library, setLibrary] = useState<LibraryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadLibrary()
  }, [])

  async function loadLibrary() {
    try {
      const { items } = await api.getLibrary()
      setLibrary(items)
    } catch (error) {
      console.error('Failed to load library:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function removeItem(item: LibraryItem) {
    try {
      if (item.type === 'course' && item.courseId) {
        await api.removeCourseFromLibrary(item.courseId)
      } else if (item.type === 'lesson' && item.lessonId) {
        await api.removeLessonFromLibrary(item.lessonId)
      }
      setLibrary((prev) => prev.filter((i) => i.id !== item.id))
    } catch (error) {
      console.error('Failed to remove item:', error)
    }
  }

  const currentItem = getCurrentItem(library)
  const otherItems = library.filter((i) => i.id !== currentItem?.id)

  // Streak & energy from auth context
  const streak = stats?.streak?.currentStreak ?? 0
  const energy = stats?.energy ?? 5

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bloom-orange border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-2">

      {/* ── Greeting ── */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <h1 className="text-2xl font-bold text-bloom-text leading-tight">
            {getGreeting(user?.name)}
          </h1>
          {streak > 0 && (
            <p className="text-sm text-bloom-text-secondary mt-0.5">
              {streak} day streak — keep it going! 🔥
            </p>
          )}
        </div>

        {/* Quick stats pill */}
        <div className="flex items-center gap-2 bg-white rounded-2xl px-3 py-2 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1">
            <Trophy size={14} className="text-amber-500" />
            <span className="text-xs font-bold text-bloom-text">
              {stats?.completedLessons ?? 0}
            </span>
          </div>
          <div className="w-px h-3 bg-gray-200" />
          <div className="flex items-center gap-1">
            <BookOpen size={14} className="text-blue-400" />
            <span className="text-xs font-bold text-bloom-text">
              {library.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── Currently Learning Hero ── */}
      {currentItem ? (
        <div>
          <CurrentlyLearningCard
            item={currentItem}
            onRemove={removeItem}
            navigate={navigate}
          />
        </div>
      ) : library.length === 0 ? null : (
        /* All items are completed — show a completion banner */
        <Card className="text-center py-6">
          <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
            <Trophy size={28} className="text-green-500" />
          </div>
          <h3 className="font-bold text-bloom-text mb-1">
            You're all caught up!
          </h3>
          <p className="text-sm text-bloom-text-secondary mb-4">
            You've completed everything in your library.
          </p>
          <button
            onClick={() => navigate('/courses')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-bloom-orange hover:underline"
          >
            Find more to learn <ChevronRight size={14} />
          </button>
        </Card>
      )}

      {/* ── My Library section ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-bloom-text">My Library</h2>
            {library.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-xs font-semibold text-bloom-text-secondary">
                {library.length}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate('/courses')}
            className="flex items-center gap-1 text-sm font-medium text-bloom-orange hover:text-bloom-orange/80 transition-colors"
          >
            Browse
            <ChevronRight size={15} />
          </button>
        </div>

        {library.length === 0 ? (
          <EmptyLibrary navigate={navigate} />
        ) : (
          <>
            {/* Currently active item also shown in grid if other items exist */}
            <div className="grid grid-cols-2 gap-3">
              {/* Show the current item first in the grid too (if there are others) */}
              {currentItem && otherItems.length > 0 && (
                <LibraryCard
                  key={currentItem.id}
                  item={currentItem}
                  isCurrent={true}
                  onRemove={removeItem}
                  navigate={navigate}
                />
              )}
              {otherItems.map((item) => (
                <LibraryCard
                  key={item.id}
                  item={item}
                  isCurrent={false}
                  onRemove={removeItem}
                  navigate={navigate}
                />
              ))}
              {/* If only one item and it's the current, still show it in grid */}
              {currentItem && otherItems.length === 0 && (
                <LibraryCard
                  key={currentItem.id}
                  item={currentItem}
                  isCurrent={true}
                  onRemove={removeItem}
                  navigate={navigate}
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Discover nudge (always visible at bottom if library has items) ── */}
      {library.length > 0 && (
        <button
          onClick={() => navigate('/courses')}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-dashed border-slate-200 text-bloom-text-secondary hover:border-bloom-orange hover:text-bloom-orange transition-all text-sm font-medium group"
        >
          <Compass
            size={16}
            className="group-hover:rotate-12 transition-transform"
          />
          Discover more lessons
        </button>
      )}
    </div>
  )
}
