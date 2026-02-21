import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Search, Hammer, ChevronRight, Globe } from 'lucide-react'
import { api, WorkshopLessonSummary } from '../lib/api'
import Card from '../components/Card'
import { AIBadge, CreatorTag } from './WorkshopPage'

export default function WorkshopBrowsePage() {
  const navigate = useNavigate()
  const [lessons, setLessons] = useState<WorkshopLessonSummary[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const limit = 20

  useEffect(() => {
    loadLessons()
  }, [offset])

  async function loadLessons() {
    try {
      setIsLoading(true)
      const result = await api.browseWorkshopLessons({ search: search || undefined, limit, offset })
      setLessons(result.lessons)
      setTotal(result.total)
    } catch (error) {
      console.error('Failed to load lessons:', error)
    } finally {
      setIsLoading(false)
    }
  }

  function handleSearch() {
    setOffset(0)
    loadLessons()
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/workshop')}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <ArrowLeft size={24} className="text-bloom-text" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-bloom-text">Community Lessons</h1>
          <p className="text-sm text-bloom-text-secondary">{total} lessons published</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-bloom-text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search lessons..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-bloom-orange/30 text-sm"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 rounded-xl bg-bloom-orange text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-bloom-orange border-t-transparent" />
        </div>
      ) : lessons.length === 0 ? (
        <Card className="text-center py-10">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
            <Globe size={32} className="text-slate-400" />
          </div>
          <p className="text-bloom-text-secondary font-medium">No lessons found</p>
          <p className="text-sm text-bloom-text-muted mt-1">Try a different search or create your own!</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {lessons.map(lesson => {
            const themeColor = lesson.themeColor || '#FF6B35'
            return (
              <Card
                key={lesson.id}
                className="cursor-pointer hover:shadow-bloom-lg transition-all duration-200"
                onClick={() => navigate(`/workshop/edit/${lesson.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${themeColor}15` }}
                  >
                    <Hammer size={22} style={{ color: themeColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-bloom-text">{lesson.title}</h3>
                    {lesson.description && (
                      <p className="text-sm text-bloom-text-secondary line-clamp-2 mt-0.5">{lesson.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <CreatorTag name={lesson.authorName} size="sm" />
                      <span className="text-xs text-bloom-text-muted">{lesson.pageCount} pages</span>
                      <AIBadge involvement={lesson.aiInvolvement} size="sm" />
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-bloom-text-muted flex-shrink-0 mt-1" />
                </div>
              </Card>
            )
          })}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - limit))}
                disabled={offset === 0}
                className="px-4 py-2 rounded-xl bg-slate-100 text-sm font-medium disabled:opacity-30 hover:bg-slate-200 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-bloom-text-secondary">
                {Math.floor(offset / limit) + 1} / {Math.ceil(total / limit)}
              </span>
              <button
                onClick={() => setOffset(offset + limit)}
                disabled={offset + limit >= total}
                className="px-4 py-2 rounded-xl bg-slate-100 text-sm font-medium disabled:opacity-30 hover:bg-slate-200 transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
