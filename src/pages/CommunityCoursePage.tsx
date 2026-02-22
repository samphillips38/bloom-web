import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Brain, ChevronLeft, Check, BookOpen, Puzzle, Pencil, Layers } from 'lucide-react'
import { api, LessonWithContent, LessonModule } from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import { AIBadge, CreatorTag } from './WorkshopPage'

export default function CommunityCoursePage() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const [lesson, setLesson] = useState<LessonWithContent | null>(null)
  const [showOverview, setShowOverview] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [completedPages, setCompletedPages] = useState<Set<number>>(new Set())

  useEffect(() => {
    if (lessonId) loadLesson()
  }, [lessonId])

  // Load completed pages from localStorage
  useEffect(() => {
    if (lessonId) {
      try {
        const stored = localStorage.getItem(`bloom-lesson-progress-${lessonId}`)
        if (stored) {
          setCompletedPages(new Set(JSON.parse(stored)))
        }
      } catch { /* ignore */ }
    }
  }, [lessonId])

  async function loadLesson() {
    try {
      const { lesson } = await api.getLesson(lessonId!)
      setLesson(lesson)
    } catch (error) {
      console.error('Failed to load community course:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const themeColor = lesson?.themeColor || '#FF6B35'

  // Build a flat list of pages respecting module order
  const { flatPages, modules } = useMemo(() => {
    if (!lesson) return { flatPages: [] as any[], modules: [] as LessonModule[] }

    const mods = (lesson.modules || []).filter(m => (m.content || []).length > 0)
    if (mods.length > 0) {
      const flat: any[] = []
      for (const mod of mods) {
        for (const page of mod.content || []) {
          flat.push(page)
        }
      }
      return { flatPages: flat, modules: mods }
    }

    // Fallback: no modules, use flat content
    return { flatPages: lesson.content || [], modules: [] as LessonModule[] }
  }, [lesson])

  const totalPages = flatPages.length

  // Find the next uncompleted page
  const nextPageIndexRaw = flatPages.findIndex((_, i) => !completedPages.has(i))
  const nextPageIndex = nextPageIndexRaw === -1 ? 0 : nextPageIndexRaw
  const allCompleted = totalPages > 0 && completedPages.size >= totalPages

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bloom-orange border-t-transparent" />
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="text-center py-12">
        <p className="text-bloom-text-secondary">Course not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Edit Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-bloom-text-secondary hover:text-bloom-text transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-medium">Back</span>
        </button>

        {lesson && !lesson.isOfficial && (
          <button
            onClick={() => navigate(`/workshop/edit/${lessonId}`)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-bloom-text-secondary hover:text-bloom-text transition-colors text-sm font-medium"
          >
            <Pencil size={14} />
            Edit
          </button>
        )}
      </div>

      {/* Course Header — identical to CourseDetailPage */}
      <div
        className="text-center py-8 rounded-3xl"
        style={{ background: `linear-gradient(180deg, ${themeColor}15 0%, transparent 100%)` }}
      >
        {/* Illustration */}
        <div
          className="w-32 h-32 mx-auto rounded-full flex items-center justify-center mb-6 cursor-pointer hover:scale-105 transition-transform"
          style={{ backgroundColor: `${themeColor}20` }}
          onClick={() => setShowOverview(true)}
        >
          <Brain size={64} style={{ color: themeColor }} />
        </div>

        {/* Creator + AI tags */}
        <div className="flex items-center justify-center gap-2 mt-3 mb-2">
          {(lesson.authorName || lesson.creatorName) && <CreatorTag name={(lesson.authorName || lesson.creatorName)!} />}
          {lesson.aiInvolvement && <AIBadge involvement={lesson.aiInvolvement} />}
        </div>
      </div>

      {/* Lesson Path — pages grouped by module */}
      <div className="space-y-0">
        {modules.length > 0 ? (
          // Module-grouped view
          (() => {
            let globalIndex = 0
            return modules.map((mod, modIdx) => {
              const modPages = mod.content || []
              const modStartIndex = globalIndex

              const moduleNode = (
                <div key={mod.id}>
                  {/* Module header */}
                  {modIdx > 0 && (
                    <div className="flex items-center gap-4 py-2">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-0.5 h-6"
                          style={{ backgroundColor: `${themeColor}20` }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 py-3 px-2 mb-1">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${themeColor}15` }}
                    >
                      <Layers size={16} style={{ color: themeColor }} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-bloom-text text-sm">
                        Module {modIdx + 1}: {mod.title}
                      </h4>
                      {mod.description && (
                        <p className="text-xs text-bloom-text-secondary">{mod.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Pages within this module */}
                  {modPages.map((page, pageIdx) => {
                    const flatIdx = modStartIndex + pageIdx
                    const completed = completedPages.has(flatIdx)
                    const isFirst = modIdx === 0 && pageIdx === 0
                    const isLast = modIdx === modules.length - 1 && pageIdx === modPages.length - 1
                    const isQuestion = page.contentData?.type === 'question'
                    const pageTitle = getPageTitle(page.contentData, pageIdx)

                    return (
                      <div key={page.id} className="flex items-start gap-4">
                        <div className="flex flex-col items-center">
                          {!(isFirst && modIdx === 0) && (
                            <div
                              className="w-0.5 h-5"
                              style={{ backgroundColor: `${themeColor}30` }}
                            />
                          )}

                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center border-3 transition-all duration-200 cursor-pointer hover:scale-105"
                            style={{
                              backgroundColor: completed ? `${themeColor}20` : 'white',
                              borderColor: themeColor,
                              borderWidth: '3px',
                            }}
                            onClick={() => navigate(`/lesson/${lessonId}?start=${flatIdx}`)}
                          >
                            {completed ? (
                              <Check size={24} style={{ color: themeColor }} strokeWidth={3} />
                            ) : isQuestion ? (
                              <Puzzle size={24} style={{ color: themeColor }} />
                            ) : (
                              <BookOpen size={24} style={{ color: themeColor }} />
                            )}
                          </div>

                          {!isLast && (
                            <div
                              className="w-0.5 h-5"
                              style={{ backgroundColor: `${themeColor}30` }}
                            />
                          )}
                        </div>

                        <div className="pt-3">
                          <h3 className="font-semibold text-bloom-text">{pageTitle}</h3>
                          {isQuestion && (
                            <span className="text-sm text-bloom-text-secondary">Exercise</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                  {/* Advance globalIndex */}
                  {(() => { globalIndex += modPages.length; return null })()}
                </div>
              )
              return moduleNode
            })
          })()
        ) : (
          // Flat view (no modules)
          flatPages.map((page, index) => {
            const completed = completedPages.has(index)
            const isFirst = index === 0
            const isLast = index === flatPages.length - 1
            const isQuestion = page.contentData?.type === 'question'
            const pageTitle = getPageTitle(page.contentData, index)

            return (
              <div key={page.id} className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  {!isFirst && (
                    <div
                      className="w-0.5 h-5"
                      style={{ backgroundColor: `${themeColor}30` }}
                    />
                  )}

                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center border-3 transition-all duration-200 cursor-pointer hover:scale-105"
                    style={{
                      backgroundColor: completed ? `${themeColor}20` : 'white',
                      borderColor: themeColor,
                      borderWidth: '3px',
                    }}
                    onClick={() => navigate(`/lesson/${lessonId}?start=${index}`)}
                  >
                    {completed ? (
                      <Check size={24} style={{ color: themeColor }} strokeWidth={3} />
                    ) : isQuestion ? (
                      <Puzzle size={24} style={{ color: themeColor }} />
                    ) : (
                      <BookOpen size={24} style={{ color: themeColor }} />
                    )}
                  </div>

                  {!isLast && (
                    <div
                      className="w-0.5 h-5"
                      style={{ backgroundColor: `${themeColor}30` }}
                    />
                  )}
                </div>

                <div className="pt-3">
                  <h3 className="font-semibold text-bloom-text">{pageTitle}</h3>
                  {isQuestion && (
                    <span className="text-sm text-bloom-text-secondary">Exercise</span>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Start Button */}
      <Card>
        <h3 className="text-lg font-bold text-bloom-text text-center mb-4">
          {lesson.title}
        </h3>
        <Button
          onClick={() => navigate(`/lesson/${lessonId}${nextPageIndex > 0 ? `?start=${nextPageIndex}` : ''}`)}
          style={{ backgroundColor: themeColor }}
        >
          {allCompleted ? 'Replay' : completedPages.size > 0 ? 'Continue' : 'Start'}
        </Button>
      </Card>

      {/* Course Overview Modal */}
      {showOverview && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowOverview(false)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div
                className="w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4"
                style={{ backgroundColor: `${themeColor}20` }}
              >
                <Brain size={48} style={{ color: themeColor }} />
              </div>
              <h2 className="text-2xl font-bold text-bloom-text">{lesson.title}</h2>
              {lesson.description && (
                <p className="text-bloom-text-secondary mt-2">{lesson.description}</p>
              )}
            </div>

            {/* Creator info */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2">
                {(lesson.authorName || lesson.creatorName) && <CreatorTag name={(lesson.authorName || lesson.creatorName)!} />}
                {lesson.aiInvolvement && <AIBadge involvement={lesson.aiInvolvement} />}
              </div>
            </div>

            {/* Tags */}
            {lesson.tags && lesson.tags.length > 0 && (
              <div className="flex justify-center gap-2 flex-wrap mb-6">
                {lesson.tags.map(tag => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-slate-100 text-xs text-bloom-text-secondary font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="flex justify-center gap-8 mb-6">
              {modules.length > 0 && (
                <div className="text-center">
                  <div className="text-xl font-bold text-bloom-text">{modules.length}</div>
                  <div className="text-sm text-bloom-text-secondary">Modules</div>
                </div>
              )}
              <div className="text-center">
                <div className="text-xl font-bold text-bloom-text">{totalPages}</div>
                <div className="text-sm text-bloom-text-secondary">Pages</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-bloom-text">
                  {flatPages.filter(p => p.contentData?.type === 'question').length}
                </div>
                <div className="text-sm text-bloom-text-secondary">Exercises</div>
              </div>
            </div>

            <Button onClick={() => setShowOverview(false)} color="dark">
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Extract a meaningful title from a content page
 */
function getPageTitle(data: any, index: number): string {
  if (data.type === 'question') {
    return data.question
      ? (data.question.length > 50 ? data.question.slice(0, 50) + '…' : data.question)
      : `Question ${index + 1}`
  }

  if (data.type === 'page' && data.blocks) {
    // Find the first heading or paragraph
    for (const block of data.blocks) {
      if (block.type === 'heading' && block.segments) {
        return block.segments.map((s: any) => s.text).join('')
      }
    }
    for (const block of data.blocks) {
      if (block.type === 'paragraph' && block.segments) {
        const text = block.segments.map((s: any) => s.text).join('')
        return text.length > 50 ? text.slice(0, 50) + '…' : text
      }
    }
  }

  if (data.type === 'text') {
    return data.text?.length > 50 ? data.text.slice(0, 50) + '…' : data.text || `Page ${index + 1}`
  }

  return `Page ${index + 1}`
}
