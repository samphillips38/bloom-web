import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Search, Hammer, ChevronRight, Globe, Tag, Star, X } from 'lucide-react'
import { api, LessonSummary, TagInfo } from '../lib/api'
import Card from '../components/Card'
import { AIBadge, CreatorTag } from './WorkshopPage'

type SortOption = 'recent' | 'rating' | 'popular'

export default function WorkshopBrowsePage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [lessons, setLessons] = useState<LessonSummary[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [sortBy, setSortBy] = useState<SortOption>('rating')
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [popularTags, setPopularTags] = useState<TagInfo[]>([])
  const limit = 20

  // Read tag from URL params on mount
  useEffect(() => {
    const tagParam = searchParams.get('tag')
    if (tagParam) {
      setSelectedTag(tagParam)
    }
    loadPopularTags()
  }, [])

  // Reload when tag, sort, or offset changes
  useEffect(() => {
    loadLessons()
  }, [offset, sortBy, selectedTag])

  async function loadPopularTags() {
    try {
      const result = await api.getPopularTags(20)
      setPopularTags(result.tags)
    } catch (error) {
      console.error('Failed to load popular tags:', error)
    }
  }

  async function loadLessons() {
    try {
      setIsLoading(true)
      const result = await api.browseLessons({
        search: search || undefined,
        tag: selectedTag || undefined,
        sort: sortBy,
        limit,
        offset,
      })
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

  function selectTag(tag: string | null) {
    setSelectedTag(tag)
    setOffset(0)
    if (tag) {
      setSearchParams({ tag })
    } else {
      setSearchParams({})
    }
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
          <h1 className="text-xl font-bold text-bloom-text">
            {selectedTag ? `Lessons: ${selectedTag}` : 'Community Lessons'}
          </h1>
          <p className="text-sm text-bloom-text-secondary">{total} lessons found</p>
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

      {/* Tag filters + Sort controls */}
      <div className="space-y-2">
        {/* Tag chips */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          <button
            onClick={() => selectTag(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
              selectedTag === null
                ? 'bg-bloom-orange text-white'
                : 'bg-slate-100 text-bloom-text-secondary hover:bg-slate-200'
            }`}
          >
            All
          </button>
          {popularTags.map(pt => (
            <button
              key={pt.tag}
              onClick={() => selectTag(pt.tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                selectedTag === pt.tag
                  ? 'bg-bloom-orange text-white'
                  : 'bg-slate-100 text-bloom-text-secondary hover:bg-slate-200'
              }`}
            >
              <Tag size={10} />
              {pt.tag}
              <span className="opacity-60">({pt.count})</span>
            </button>
          ))}
        </div>

        {/* Active filter indicator + sort */}
        <div className="flex items-center justify-between">
          {selectedTag && (
            <button
              onClick={() => selectTag(null)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-bloom-orange/10 text-bloom-orange text-xs font-medium hover:bg-bloom-orange/20 transition-colors"
            >
              <Tag size={10} />
              {selectedTag}
              <X size={10} />
            </button>
          )}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs text-bloom-text-muted mr-1">Sort:</span>
            {[
              { key: 'rating' as SortOption, label: 'Top Rated' },
              { key: 'popular' as SortOption, label: 'Most Used' },
              { key: 'recent' as SortOption, label: 'Newest' },
            ].map(opt => (
              <button
                key={opt.key}
                onClick={() => { setSortBy(opt.key); setOffset(0) }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === opt.key
                    ? 'bg-bloom-blue/10 text-bloom-blue'
                    : 'text-bloom-text-muted hover:bg-slate-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
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
          <p className="text-sm text-bloom-text-muted mt-1">
            {selectedTag
              ? `No lessons tagged "${selectedTag}" yet. Be the first!`
              : 'Try a different search or create your own!'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {lessons.map(lesson => {
            const themeColor = lesson.themeColor || '#FF6B35'
            return (
              <Card
                key={lesson.id}
                className="cursor-pointer hover:shadow-bloom-lg transition-all duration-200"
                onClick={() => navigate(`/lesson/${lesson.id}/overview`)}
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
                      {lesson.averageRating > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-xs text-amber-600 font-medium">
                          <Star size={11} className="fill-amber-400 text-amber-400" />
                          {lesson.averageRating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    {lesson.tags && lesson.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5">
                        {lesson.tags.slice(0, 4).map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[10px] text-bloom-text-muted font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                        {lesson.tags.length > 4 && (
                          <span className="text-[10px] text-bloom-text-muted">+{lesson.tags.length - 4}</span>
                        )}
                      </div>
                    )}
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
