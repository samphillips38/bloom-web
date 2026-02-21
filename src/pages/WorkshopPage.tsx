import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Sparkles, Lock, Globe, ChevronRight, Hammer, Bot, UserCheck } from 'lucide-react'
import { api, WorkshopLessonSummary } from '../lib/api'
import Card from '../components/Card'

export default function WorkshopPage() {
  const navigate = useNavigate()
  const [myLessons, setMyLessons] = useState<WorkshopLessonSummary[]>([])
  const [communityLessons, setCommunityLessons] = useState<WorkshopLessonSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const [myRes, browseRes] = await Promise.all([
        api.getMyWorkshopLessons(),
        api.browseWorkshopLessons({ limit: 10 }),
      ])
      setMyLessons(myRes.lessons)
      setCommunityLessons(browseRes.lessons)
    } catch (error) {
      console.error('Failed to load workshop data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bloom-orange border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gradient-to-r from-amber-50 to-orange-50 rounded-full border border-amber-200/50 mb-3">
          <Hammer size={16} className="text-bloom-orange" />
          <span className="text-sm font-semibold text-bloom-orange">Workshop</span>
        </div>
        <h1 className="text-2xl font-bold text-bloom-text">Create & Share Lessons</h1>
        <p className="text-bloom-text-secondary mt-1">Build lessons on any topic you're passionate about</p>
      </div>

      {/* Create New Lesson */}
      <button
        onClick={() => navigate('/workshop/new')}
        className="w-full bg-gradient-to-br from-bloom-orange to-amber-500 rounded-2xl p-4 shadow-lg shadow-bloom-orange/20 active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Plus size={22} className="text-white" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-bold text-white text-base">New Lesson</h3>
            <p className="text-sm text-white/70">Start from scratch or generate with AI</p>
          </div>
          <ChevronRight size={20} className="text-white/60 flex-shrink-0" />
        </div>
      </button>

      {/* My Lessons */}
      <div>
        <h2 className="text-lg font-bold text-bloom-text mb-3">My Lessons</h2>
        {myLessons.length === 0 ? (
          <Card className="text-center py-8">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Hammer size={32} className="text-slate-400" />
            </div>
            <p className="text-bloom-text-secondary font-medium">No lessons yet</p>
            <p className="text-sm text-bloom-text-muted mt-1">Create your first lesson to get started</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {myLessons.map(lesson => (
              <WorkshopLessonCard
                key={lesson.id}
                lesson={lesson}
                showStatus
                onClick={() => navigate(`/workshop/edit/${lesson.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Community Lessons */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-bloom-text">Community Lessons</h2>
          <button
            onClick={() => navigate('/workshop/browse')}
            className="flex items-center gap-1 text-sm font-medium text-bloom-orange hover:text-bloom-orange/80 transition-colors"
          >
            Browse All
            <ChevronRight size={16} />
          </button>
        </div>
        {communityLessons.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-bloom-text-secondary">No community lessons published yet</p>
            <p className="text-sm text-bloom-text-muted mt-1">Be the first to share your knowledge!</p>
          </Card>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3" style={{ minWidth: 'min-content' }}>
              {communityLessons.map(lesson => (
                <div key={lesson.id} className="w-64 flex-shrink-0">
                  <WorkshopLessonCard
                    lesson={lesson}
                    showAuthor
                    onClick={() => navigate(`/workshop/edit/${lesson.id}`)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Workshop Lesson Card
// ═══════════════════════════════════════════════════════

function WorkshopLessonCard({
  lesson,
  showStatus,
  showAuthor,
  onClick,
}: {
  lesson: WorkshopLessonSummary
  showStatus?: boolean
  showAuthor?: boolean
  onClick: () => void
}) {
  const themeColor = lesson.themeColor || '#FF6B35'

  return (
    <Card
      className="cursor-pointer hover:shadow-bloom-lg transition-all duration-200 hover:scale-[1.01]"
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${themeColor}15` }}
        >
          <Hammer size={22} style={{ color: themeColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-bloom-text truncate">{lesson.title}</h3>
          {lesson.description && (
            <p className="text-sm text-bloom-text-secondary line-clamp-2 mt-0.5">{lesson.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            {showStatus && (
              <StatusBadge status={lesson.status} />
            )}
            {showAuthor && (
              <span className="text-xs text-bloom-text-muted">By {lesson.authorName}</span>
            )}
            <span className="text-xs text-bloom-text-muted">{lesson.pageCount} pages</span>
            <AIBadge involvement={lesson.aiInvolvement} size="sm" />
            {lesson.visibility === 'private' ? (
              <Lock size={12} className="text-bloom-text-muted" />
            ) : (
              <Globe size={12} className="text-bloom-text-muted" />
            )}
          </div>
        </div>
        <ChevronRight size={18} className="text-bloom-text-muted flex-shrink-0 mt-1" />
      </div>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
//  Shared UI Components
// ═══════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    draft: { bg: 'bg-slate-100', text: 'text-slate-600', label: 'Draft' },
    published: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Published' },
  }
  const c = config[status] || config.draft
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  )
}

export function AIBadge({ involvement, size = 'md' }: { involvement: string; size?: 'sm' | 'md' }) {
  if (involvement === 'none') return null

  const isSmall = size === 'sm'

  if (involvement === 'full') {
    return (
      <span className={`inline-flex items-center gap-1 ${isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'} rounded-full bg-purple-100 text-purple-700 font-medium`}>
        <Bot size={isSmall ? 10 : 12} />
        AI Generated
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center gap-1 ${isSmall ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'} rounded-full bg-blue-100 text-blue-700 font-medium`}>
      <Sparkles size={isSmall ? 10 : 12} />
      AI + Human
    </span>
  )
}

export function CreatorTag({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' }) {
  const isSmall = size === 'sm'
  return (
    <span className={`inline-flex items-center gap-1 ${isSmall ? 'text-[10px]' : 'text-xs'} text-bloom-text-muted`}>
      <UserCheck size={isSmall ? 10 : 12} />
      {name}
    </span>
  )
}
