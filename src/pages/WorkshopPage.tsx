import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Sparkles, Lock, Globe, ChevronRight, Hammer, Bot, UserCheck, Trash2, Loader2 } from 'lucide-react'
import { api, LessonSummary, GenerationJob } from '../lib/api'
import Card from '../components/Card'

export default function WorkshopPage() {
  const navigate = useNavigate()
  const [myLessons, setMyLessons] = useState<LessonSummary[]>([])
  const [publicLessons, setPublicLessons] = useState<LessonSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // Map of lessonId → GenerationJob for lessons with active generation
  const [generatingLessons, setGeneratingLessons] = useState<Record<string, GenerationJob>>({})
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    loadData()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function handleDeleteLesson(id: string) {
    setDeletingId(id)
    try {
      await api.deleteLesson(id)
      setMyLessons(prev => prev.filter(l => l.id !== id))
    } catch (error) {
      console.error('Failed to delete lesson:', error)
    } finally {
      setDeletingId(null)
      setConfirmDeleteId(null)
    }
  }

  async function loadData() {
    try {
      const [myRes, browseRes] = await Promise.all([
        api.getMyLessons(),
        api.browseLessons({ limit: 10 }),
      ])
      setMyLessons(myRes.lessons)
      setPublicLessons(browseRes.lessons)

      // Check generation status for all my lessons
      checkAllGenerationStatuses(myRes.lessons.map(l => l.id))
    } catch (error) {
      console.error('Failed to load workshop data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function checkAllGenerationStatuses(lessonIds: string[]) {
    const activeJobs: Record<string, GenerationJob> = {}
    await Promise.all(
      lessonIds.map(async (id) => {
        try {
          const { job } = await api.getGenerationStatus(id)
          if (job && (job.status === 'pending' || job.status === 'planning' || job.status === 'generating')) {
            activeJobs[id] = job
          }
        } catch { /* ignore */ }
      }),
    )
    if (Object.keys(activeJobs).length > 0) {
      setGeneratingLessons(activeJobs)
      startPolling(lessonIds)
    }
  }

  function startPolling(lessonIds: string[]) {
    if (pollRef.current) return
    pollRef.current = setInterval(async () => {
      const updated: Record<string, GenerationJob> = {}
      let anyCompleted = false
      await Promise.all(
        lessonIds.map(async (id) => {
          try {
            const { job } = await api.getGenerationStatus(id)
            if (!job) return
            if (job.status === 'pending' || job.status === 'planning' || job.status === 'generating') {
              updated[id] = job
            } else if (job.status === 'completed') {
              anyCompleted = true
            }
          } catch { /* ignore */ }
        }),
      )
      setGeneratingLessons(updated)
      if (Object.keys(updated).length === 0) {
        clearInterval(pollRef.current!)
        pollRef.current = null
        if (anyCompleted) {
          // Reload to pick up new page counts / titles
          loadData()
        }
      }
    }, 4000)
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
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                showStatus
                generationJob={generatingLessons[lesson.id]}
                onClick={() => navigate(`/workshop/edit/${lesson.id}`)}
                onDelete={() => setConfirmDeleteId(lesson.id)}
                isDeleting={deletingId === lesson.id}
                confirmingDelete={confirmDeleteId === lesson.id}
                onCancelDelete={() => setConfirmDeleteId(null)}
                onConfirmDelete={() => handleDeleteLesson(lesson.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Public Lessons */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-bloom-text">Public Lessons</h2>
          <button
            onClick={() => navigate('/workshop/browse')}
            className="flex items-center gap-1 text-sm font-medium text-bloom-orange hover:text-bloom-orange/80 transition-colors"
          >
            Browse All
            <ChevronRight size={16} />
          </button>
        </div>
        {publicLessons.length === 0 ? (
          <Card className="text-center py-8">
            <p className="text-bloom-text-secondary">No public lessons yet</p>
            <p className="text-sm text-bloom-text-muted mt-1">Be the first to share your knowledge!</p>
          </Card>
        ) : (
          <div className="overflow-x-auto -mx-4 px-4">
            <div className="flex gap-3" style={{ minWidth: 'min-content' }}>
              {publicLessons.map(lesson => (
                <div key={lesson.id} className="w-64 flex-shrink-0">
                  <LessonCard
                    lesson={lesson}
                    showAuthor
                    onClick={() => navigate(`/lesson/${lesson.id}/overview`)}
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
//  Lesson Card
// ═══════════════════════════════════════════════════════

function LessonCard({
  lesson,
  showStatus,
  showAuthor,
  generationJob,
  onClick,
  onDelete,
  isDeleting,
  confirmingDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  lesson: LessonSummary
  showStatus?: boolean
  showAuthor?: boolean
  generationJob?: GenerationJob
  onClick: () => void
  onDelete?: () => void
  isDeleting?: boolean
  confirmingDelete?: boolean
  onCancelDelete?: () => void
  onConfirmDelete?: () => void
}) {
  const themeColor = lesson.themeColor || '#FF6B35'

  return (
    <Card
      className="transition-all duration-200 hover:shadow-bloom-lg"
    >
      {confirmingDelete ? (
        // Inline delete confirmation
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-bloom-text truncate">Delete "{lesson.title}"?</p>
            <p className="text-xs text-bloom-text-muted mt-0.5">This cannot be undone.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onCancelDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-bloom-text font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirmDelete}
              disabled={isDeleting}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isDeleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
              Delete
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 cursor-pointer"
            style={{ backgroundColor: `${themeColor}15` }}
            onClick={onClick}
          >
            <Hammer size={22} style={{ color: themeColor }} />
          </div>
          <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
            <h3 className="font-semibold text-bloom-text truncate">{lesson.title}</h3>
            {lesson.description && (
              <p className="text-sm text-bloom-text-secondary line-clamp-2 mt-0.5">{lesson.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {generationJob ? (
                <GeneratingBadge job={generationJob} />
              ) : (
                showStatus && <StatusBadge status={lesson.status} />
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
          <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
            {onDelete && (
              <button
                onClick={e => { e.stopPropagation(); onDelete() }}
                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete lesson"
              >
                <Trash2 size={16} className="text-red-400" />
              </button>
            )}
            <ChevronRight size={18} className="text-bloom-text-muted cursor-pointer" onClick={onClick} />
          </div>
        </div>
      )}
    </Card>
  )
}

// ═══════════════════════════════════════════════════════
//  Shared UI Components
// ═══════════════════════════════════════════════════════

function GeneratingBadge({ job }: { job: GenerationJob }) {
  const label =
    job.status === 'planning' ? 'Planning lesson…' :
    job.status === 'generating' ? `Generating modules… ${job.progress != null ? `${Math.round(Number(job.progress) * 100)}%` : ''}` :
    'Queued…'

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
      <Loader2 size={10} className="animate-spin" />
      {label}
    </span>
  )
}

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
