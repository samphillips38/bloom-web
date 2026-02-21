import { useState, useEffect } from 'react'
import { X, UserCheck, Users, Bot, Sparkles, Clock, FileText, ExternalLink, ChevronRight } from 'lucide-react'
import { api, LessonMetadata } from '../../lib/api'

interface MetadataPanelProps {
  workshopLessonId?: string | null
  lessonId?: string | null
  currentPageIndex: number
  isOpen: boolean
  onClose: () => void
  slideProgress: number // 0 to 1, for partial reveal during swipe
}

export default function MetadataPanel({
  workshopLessonId,
  lessonId,
  currentPageIndex,
  isOpen,
  onClose,
  slideProgress,
}: MetadataPanelProps) {
  const [metadata, setMetadata] = useState<LessonMetadata | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)

  const isWorkshop = !!workshopLessonId
  const effectiveId = workshopLessonId || lessonId

  useEffect(() => {
    if (isOpen && !metadata && !loadFailed && effectiveId) {
      loadMetadata()
    }
  }, [isOpen, effectiveId])

  async function loadMetadata() {
    if (!effectiveId) return
    try {
      setIsLoading(true)
      setLoadFailed(false)
      // Use the right endpoint depending on lesson type
      const { metadata: data } = isWorkshop
        ? await api.getWorkshopLessonMetadata(effectiveId)
        : await api.getLessonMetadata(effectiveId)
      setMetadata(data)
    } catch (error) {
      console.error('Failed to load metadata:', error)
      setLoadFailed(true)
    } finally {
      setIsLoading(false)
    }
  }

  const currentPage = metadata?.pages?.[currentPageIndex]
  const translateX = isOpen ? 0 : 100 - (slideProgress * 100)

  return (
    <>
      {/* Backdrop */}
      {(isOpen || slideProgress > 0) && (
        <div
          className="fixed inset-0 z-50 bg-black/20 transition-opacity duration-300"
          style={{ opacity: isOpen ? 1 : slideProgress * 0.5 }}
          onClick={onClose}
        />
      )}

      {/* Panel */}
      <div
        className="fixed top-0 right-0 bottom-0 z-50 w-80 max-w-[85vw] bg-white shadow-2xl overflow-y-auto"
        style={{
          transform: `translateX(${translateX}%)`,
          transition: isOpen ? 'transform 0.3s cubic-bezier(0.22, 1, 0.36, 1)' : slideProgress > 0 ? 'none' : 'transform 0.3s ease',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-xl border-b border-slate-100 px-4 py-3 z-10">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-bloom-text">Page Info</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
              <X size={18} className="text-bloom-text-secondary" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-3 border-bloom-orange border-t-transparent" />
          </div>
        ) : metadata ? (
          <div className="p-4 space-y-5">
            {/* Lesson-level info */}
            <section className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lesson</h4>
              
              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-bloom-orange to-amber-400 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">
                    {metadata.lesson.authorName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="text-sm font-medium text-bloom-text">{metadata.lesson.authorName}</p>
                  <p className="text-xs text-bloom-text-muted">Author</p>
                </div>
              </div>

              {/* AI Badge */}
              <div className="flex items-center gap-2">
                <AIIndicator involvement={metadata.lesson.aiInvolvement} />
              </div>

              {/* Stats */}
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 text-sm text-bloom-text-secondary">
                  <FileText size={14} />
                  <span>{metadata.pages.length} pages</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-bloom-text-secondary">
                  <Users size={14} />
                  <span>{metadata.lesson.totalEdits} edits</span>
                </div>
              </div>

              <div className="text-xs text-bloom-text-muted">
                Created {new Date(metadata.lesson.createdAt).toLocaleDateString()}
              </div>
            </section>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

            {/* Current page info */}
            {currentPage && (
              <section className="space-y-3">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  This Page
                </h4>

                {/* Page author */}
                <div className="flex items-center gap-2">
                  <UserCheck size={14} className="text-bloom-text-secondary" />
                  <span className="text-sm text-bloom-text">
                    Written by <strong>{currentPage.authorName}</strong>
                  </span>
                </div>

                {/* Editors */}
                {currentPage.editors.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={14} className="text-bloom-text-secondary" />
                      <span className="text-sm text-bloom-text-secondary">Edited by</span>
                    </div>
                    <div className="space-y-1.5 ml-5">
                      {currentPage.editors.map((editor, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm text-bloom-text">{editor.name}</span>
                          <span className="text-xs text-bloom-text-muted">
                            {new Date(editor.editedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last edited */}
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-bloom-text-secondary" />
                  <span className="text-sm text-bloom-text-secondary">
                    Last edited {new Date(currentPage.lastEdited).toLocaleDateString()}
                  </span>
                </div>

                {/* Sources */}
                {currentPage.sources.length > 0 && (
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sources</h5>
                    <div className="space-y-2">
                      {currentPage.sources.map((source, i) => (
                        <div key={i} className="p-2.5 bg-slate-50 rounded-xl">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-bloom-text">{source.title}</p>
                              {source.description && (
                                <p className="text-xs text-bloom-text-muted mt-0.5">{source.description}</p>
                              )}
                            </div>
                            {source.url && (
                              <a
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 hover:bg-white rounded transition-colors flex-shrink-0"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink size={14} className="text-bloom-orange" />
                              </a>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-bloom-text-muted">
            <p>No metadata available for this lesson.</p>
            <p className="mt-1 text-xs">Metadata is available for community-created lessons.</p>
          </div>
        )}

        {/* Back to lesson button */}
        <div className="p-4 mt-2">
          <button
            onClick={onClose}
            className="w-full py-3.5 px-6 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-semibold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-lg"
          >
            Back to Lesson
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </>
  )
}

function AIIndicator({ involvement }: { involvement: string }) {
  if (involvement === 'none') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium">
        <UserCheck size={12} />
        Human Made
      </span>
    )
  }
  if (involvement === 'collaboration') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
        <Sparkles size={12} />
        AI + Human Collaboration
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-medium">
      <Bot size={12} />
      AI Generated
    </span>
  )
}
