import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Eye, Send, Trash2, Plus, GripVertical, ChevronDown, ChevronUp,
  Type, Image, HelpCircle, Lightbulb, List, Calculator, Minus, Space, Sparkles,
  Globe, Lock, Shield, ShieldOff, Settings, X, Loader2, Check, ChevronRight, ChevronLeft,
} from 'lucide-react'
import {
  api, WorkshopLessonWithContent, ContentData,
  ContentBlock, TextSegment, SourceReference,
} from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import RichContentRenderer, { RichText } from '../components/RichContentRenderer'
import ProgressBar from '../components/ProgressBar'

// ═══════════════════════════════════════════════════════
//  Main Editor Page
// ═══════════════════════════════════════════════════════

export default function WorkshopEditorPage() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const isNew = !lessonId

  const [, setLesson] = useState<WorkshopLessonWithContent | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [themeColor, setThemeColor] = useState('#FF6B35')
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [editPolicy, setEditPolicy] = useState<'open' | 'approval'>('approval')
  const [pages, setPages] = useState<PageDraft[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedPage, setExpandedPage] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showBlockPalette, setShowBlockPalette] = useState(false)
  const [showAIDraft, setShowAIDraft] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewPageIndex, setPreviewPageIndex] = useState(0)
  const [savedLessonId, setSavedLessonId] = useState<string | null>(lessonId || null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    if (lessonId) {
      loadLesson(lessonId)
    }
  }, [lessonId])

  async function loadLesson(id: string) {
    try {
      setIsLoading(true)
      const { lesson } = await api.getWorkshopLesson(id)
      setLesson(lesson)
      setTitle(lesson.title)
      setDescription(lesson.description || '')
      setThemeColor(lesson.themeColor || '#FF6B35')
      setVisibility(lesson.visibility as 'private' | 'public')
      setEditPolicy(lesson.editPolicy as 'open' | 'approval')
      setPages(lesson.content.map(c => ({
        id: c.id,
        contentType: c.contentType,
        contentData: c.contentData,
        sources: c.sources || [],
        saved: true,
      })))
    } catch (error) {
      console.error('Failed to load lesson:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    if (!title.trim()) return
    setIsSaving(true)

    try {
      let currentId = savedLessonId

      if (!currentId) {
        // Create new lesson
        const { lesson } = await api.createWorkshopLesson({
          title: title.trim(),
          description: description.trim() || undefined,
          themeColor,
          visibility,
          editPolicy,
        })
        currentId = lesson.id
        setSavedLessonId(lesson.id)
      } else {
        // Update lesson metadata
        await api.updateWorkshopLesson(currentId, {
          title: title.trim(),
          description: description.trim() || undefined,
          themeColor,
          visibility,
          editPolicy,
        })
      }

      // Save unsaved pages
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i]
        if (!page.saved) {
          if (page.id) {
            // Update existing page
            await api.updateWorkshopContent(currentId, page.id, {
              contentType: page.contentType,
              contentData: page.contentData,
              sources: page.sources,
            })
          } else {
            // Add new page
            const { content } = await api.addWorkshopContent(currentId, {
              contentType: page.contentType,
              contentData: page.contentData,
              sources: page.sources,
            })
            pages[i] = { ...page, id: content.id, saved: true }
          }
        }
      }

      // Reorder pages
      const pageIds = pages.filter(p => p.id).map(p => p.id!)
      if (pageIds.length > 0) {
        await api.reorderWorkshopContent(currentId, pageIds)
      }

      setPages(pages.map(p => ({ ...p, saved: true })))

      // If navigating from /workshop/new, redirect to edit URL
      if (isNew && currentId) {
        navigate(`/workshop/edit/${currentId}`, { replace: true })
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function handlePublish() {
    if (!savedLessonId) {
      await handleSave()
    }
    if (!savedLessonId && !pages.some(p => p.id)) return

    const id = savedLessonId!
    try {
      await api.publishWorkshopLesson(id)
      navigate('/workshop')
    } catch (error) {
      console.error('Failed to publish:', error)
    }
  }

  async function handleDeletePage(index: number) {
    const page = pages[index]
    if (page.id && savedLessonId) {
      try {
        await api.deleteWorkshopContent(savedLessonId, page.id)
      } catch (error) {
        console.error('Failed to delete page:', error)
      }
    }
    setPages(prev => prev.filter((_, i) => i !== index))
    if (expandedPage === index) setExpandedPage(null)
  }

  function addPage(contentData: ContentData) {
    const contentType = contentData.type === 'question' ? 'question' : 'page'
    setPages(prev => [...prev, {
      id: null,
      contentType,
      contentData,
      sources: [],
      saved: false,
    }])
    setExpandedPage(pages.length)
    setShowBlockPalette(false)
  }

  function updatePage(index: number, contentData: ContentData) {
    setPages(prev => prev.map((p, i) => i === index ? { ...p, contentData, saved: false } : p))
  }

  function updatePageSources(index: number, sources: SourceReference[]) {
    setPages(prev => prev.map((p, i) => i === index ? { ...p, sources, saved: false } : p))
  }

  // Drag reorder
  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(index: number) {
    if (dragIndex === null || dragIndex === index) return
    const newPages = [...pages]
    const [moved] = newPages.splice(dragIndex, 1)
    newPages.splice(index, 0, { ...moved, saved: false })
    setPages(newPages)
    setDragIndex(index)
  }

  function handleDragEnd() {
    setDragIndex(null)
  }

  // AI Draft callback
  function handleAIDraftGenerated(generatedPages: ContentData[]) {
    const newPages: PageDraft[] = generatedPages.map(cd => ({
      id: null,
      contentType: cd.type === 'question' ? 'question' : 'page',
      contentData: cd,
      sources: [],
      saved: false,
    }))
    setPages(prev => [...prev, ...newPages])
    setShowAIDraft(false)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bloom-orange border-t-transparent" />
      </div>
    )
  }

  if (showPreview && pages.length > 0) {
    return (
      <PreviewOverlay
        pages={pages}
        pageIndex={previewPageIndex}
        onClose={() => setShowPreview(false)}
        onChangeIndex={setPreviewPageIndex}
      />
    )
  }

  return (
    <div className="space-y-4 animate-fade-in pb-32">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/workshop')} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
          <ArrowLeft size={24} className="text-bloom-text" />
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <Settings size={20} className="text-bloom-text-secondary" />
          </button>
          {pages.length > 0 && (
            <button
              onClick={() => { setPreviewPageIndex(0); setShowPreview(true) }}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <Eye size={20} className="text-bloom-text-secondary" />
            </button>
          )}
          <Button
            color="orange"
            onClick={handleSave}
            disabled={!title.trim() || isSaving}
            className="!px-4 !py-2"
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            <span className="ml-1.5">{isSaving ? 'Saving...' : 'Save'}</span>
          </Button>
        </div>
      </div>

      {/* Title & Description */}
      <div className="space-y-3">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Lesson title..."
          className="w-full text-2xl font-bold text-bloom-text bg-transparent outline-none placeholder:text-slate-300"
        />
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Add a description..."
          className="w-full text-bloom-text-secondary bg-transparent outline-none placeholder:text-slate-300"
        />
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="space-y-4 animate-slide-up">
          <h3 className="font-semibold text-bloom-text">Lesson Settings</h3>

          {/* Theme Color */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-bloom-text-secondary">Theme Color</span>
            <div className="flex gap-2">
              {['#FF6B35', '#4A90D9', '#4CAF50', '#9C27B0', '#E91E63', '#FF9800'].map(color => (
                <button
                  key={color}
                  onClick={() => setThemeColor(color)}
                  className={`w-7 h-7 rounded-full transition-transform ${themeColor === color ? 'scale-125 ring-2 ring-offset-2 ring-slate-300' : ''}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-bloom-text-secondary">Visibility</span>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setVisibility('private')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  visibility === 'private' ? 'bg-white shadow-sm text-bloom-text' : 'text-bloom-text-muted'
                }`}
              >
                <Lock size={14} /> Private
              </button>
              <button
                onClick={() => setVisibility('public')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  visibility === 'public' ? 'bg-white shadow-sm text-bloom-text' : 'text-bloom-text-muted'
                }`}
              >
                <Globe size={14} /> Public
              </button>
            </div>
          </div>

          {/* Edit Policy */}
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-bloom-text-secondary block">Edit Policy</span>
              <span className="text-xs text-bloom-text-muted">
                {editPolicy === 'open' ? 'Anyone can edit directly' : 'Edits require your approval'}
              </span>
            </div>
            <div className="flex bg-slate-100 rounded-xl p-1">
              <button
                onClick={() => setEditPolicy('approval')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  editPolicy === 'approval' ? 'bg-white shadow-sm text-bloom-text' : 'text-bloom-text-muted'
                }`}
              >
                <Shield size={14} /> Approval
              </button>
              <button
                onClick={() => setEditPolicy('open')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  editPolicy === 'open' ? 'bg-white shadow-sm text-bloom-text' : 'text-bloom-text-muted'
                }`}
              >
                <ShieldOff size={14} /> Open
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* AI Draft Button */}
      <button
        onClick={() => setShowAIDraft(true)}
        className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 hover:bg-purple-50 hover:border-purple-300 transition-all"
      >
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
          <Sparkles size={20} className="text-white" />
        </div>
        <div className="text-left">
          <span className="font-semibold text-purple-900">Generate with AI</span>
          <p className="text-xs text-purple-600">Describe a topic and AI will create a full lesson draft</p>
        </div>
      </button>

      {/* Content Pages List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-bloom-text flex items-center gap-2">
          Pages <span className="text-sm font-normal text-bloom-text-muted">({pages.length})</span>
        </h3>

        {pages.map((page, index) => (
          <PageCard
            key={page.id || `draft-${index}`}
            page={page}
            index={index}
            isExpanded={expandedPage === index}
            onToggle={() => setExpandedPage(expandedPage === index ? null : index)}
            onUpdate={(data) => updatePage(index, data)}
            onUpdateSources={(sources) => updatePageSources(index, sources)}
            onDelete={() => handleDeletePage(index)}
            onDragStart={() => handleDragStart(index)}
            onDragOver={() => handleDragOver(index)}
            onDragEnd={handleDragEnd}
            isDragging={dragIndex === index}
          />
        ))}

        {/* Add Page Button */}
        <button
          onClick={() => setShowBlockPalette(true)}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-bloom-text-muted hover:border-bloom-orange hover:text-bloom-orange transition-all"
        >
          <Plus size={20} />
          <span className="font-medium">Add Page</span>
        </button>
      </div>

      {/* Publish Button */}
      {pages.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 px-4 z-30">
          <div className="max-w-4xl mx-auto">
            <Button
              color="orange"
              onClick={handlePublish}
              className="w-full !py-3.5 shadow-xl shadow-bloom-orange/20"
            >
              <Send size={18} />
              <span className="font-bold">Publish Lesson</span>
            </Button>
          </div>
        </div>
      )}

      {/* Block Palette Bottom Sheet */}
      {showBlockPalette && (
        <BlockPaletteSheet
          onSelect={addPage}
          onClose={() => setShowBlockPalette(false)}
        />
      )}

      {/* AI Draft Dialog */}
      {showAIDraft && (
        <AIDraftDialog
          onGenerated={handleAIDraftGenerated}
          onClose={() => setShowAIDraft(false)}
        />
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Types
// ═══════════════════════════════════════════════════════

interface PageDraft {
  id: string | null
  contentType: string
  contentData: ContentData
  sources: SourceReference[]
  saved: boolean
}

// ═══════════════════════════════════════════════════════
//  Page Card (editable, draggable)
// ═══════════════════════════════════════════════════════

function PageCard({
  page,
  index,
  isExpanded,
  onToggle,
  onUpdate,
  onUpdateSources,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
}: {
  page: PageDraft
  index: number
  isExpanded: boolean
  onToggle: () => void
  onUpdate: (data: ContentData) => void
  onUpdateSources: (sources: SourceReference[]) => void
  onDelete: () => void
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
  isDragging: boolean
}) {
  const data = page.contentData
  const pageLabel = data.type === 'question'
    ? `Question: ${(data as any).question?.substring(0, 40) || 'Untitled'}...`
    : `Page ${index + 1}`

  const preview = getPagePreview(data)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={(e) => { e.preventDefault(); onDragOver() }}
      onDragEnd={onDragEnd}
      className={`transition-all duration-200 ${isDragging ? 'opacity-50 scale-95' : ''}`}
    >
      <Card className={`${!page.saved ? 'ring-2 ring-bloom-orange/30' : ''}`}>
        {/* Header */}
        <div className="flex items-center gap-2">
          <div
            className="p-1 cursor-grab active:cursor-grabbing text-bloom-text-muted hover:text-bloom-text-secondary touch-none"
          >
            <GripVertical size={18} />
          </div>

          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
              data.type === 'question'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-600'
            }`}
          >
            {data.type === 'question' ? '?' : index + 1}
          </div>

          <button onClick={onToggle} className="flex-1 text-left">
            <span className="font-medium text-bloom-text text-sm">{pageLabel}</span>
            {preview && (
              <p className="text-xs text-bloom-text-muted truncate mt-0.5">{preview}</p>
            )}
          </button>

          <div className="flex items-center gap-1">
            {!page.saved && (
              <span className="w-2 h-2 rounded-full bg-bloom-orange" title="Unsaved" />
            )}
            <button onClick={onToggle} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button onClick={onDelete} className="p-1 hover:bg-red-50 rounded-lg text-bloom-text-muted hover:text-red-500 transition-colors">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Expanded Editor */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-slate-100 animate-slide-up">
            <ContentEditor
              data={data}
              sources={page.sources}
              onUpdate={onUpdate}
              onUpdateSources={onUpdateSources}
            />
          </div>
        )}
      </Card>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Content Editor
// ═══════════════════════════════════════════════════════

function ContentEditor({
  data,
  sources,
  onUpdate,
  onUpdateSources,
}: {
  data: ContentData
  sources: SourceReference[]
  onUpdate: (data: ContentData) => void
  onUpdateSources: (sources: SourceReference[]) => void
}) {
  if (data.type === 'question') {
    return (
      <QuestionEditor
        data={data as Extract<ContentData, { type: 'question' }>}
        onUpdate={onUpdate}
      />
    )
  }

  if (data.type === 'page') {
    return (
      <PageBlocksEditor
        blocks={(data as Extract<ContentData, { type: 'page' }>).blocks}
        sources={sources}
        onUpdate={(blocks) => onUpdate({ type: 'page', blocks })}
        onUpdateSources={onUpdateSources}
      />
    )
  }

  return <p className="text-sm text-bloom-text-muted">Unsupported content type</p>
}

// ═══════════════════════════════════════════════════════
//  Page Blocks Editor
// ═══════════════════════════════════════════════════════

function PageBlocksEditor({
  blocks,
  sources,
  onUpdate,
  onUpdateSources,
}: {
  blocks: ContentBlock[]
  sources: SourceReference[]
  onUpdate: (blocks: ContentBlock[]) => void
  onUpdateSources: (sources: SourceReference[]) => void
}) {
  function addBlock(block: ContentBlock) {
    onUpdate([...blocks, block])
  }

  function updateBlock(index: number, block: ContentBlock) {
    const newBlocks = [...blocks]
    newBlocks[index] = block
    onUpdate(newBlocks)
  }

  function removeBlock(index: number) {
    onUpdate(blocks.filter((_, i) => i !== index))
  }

  function moveBlock(index: number, direction: 'up' | 'down') {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= blocks.length) return
    const newBlocks = [...blocks]
    ;[newBlocks[index], newBlocks[newIndex]] = [newBlocks[newIndex], newBlocks[index]]
    onUpdate(newBlocks)
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, i) => (
        <BlockEditor
          key={i}
          block={block}
          onUpdate={(b) => updateBlock(i, b)}
          onRemove={() => removeBlock(i)}
          onMoveUp={i > 0 ? () => moveBlock(i, 'up') : undefined}
          onMoveDown={i < blocks.length - 1 ? () => moveBlock(i, 'down') : undefined}
        />
      ))}

      {/* Add block inline */}
      <div className="flex flex-wrap gap-2">
        {[
          { type: 'heading', label: 'H', icon: Type },
          { type: 'paragraph', label: 'P', icon: Type },
          { type: 'image', label: '🖼', icon: Image },
          { type: 'callout', label: '💡', icon: Lightbulb },
          { type: 'bulletList', label: '•', icon: List },
          { type: 'math', label: '∑', icon: Calculator },
          { type: 'divider', label: '—', icon: Minus },
          { type: 'spacer', label: '↕', icon: Space },
        ].map(item => (
          <button
            key={item.type}
            onClick={() => addBlock(createEmptyBlock(item.type as ContentBlock['type']))}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-bloom-text-secondary transition-colors"
          >
            <item.icon size={12} />
            {item.type}
          </button>
        ))}
      </div>

      {/* Sources */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <SourcesEditor sources={sources} onUpdate={onUpdateSources} />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Individual Block Editor
// ═══════════════════════════════════════════════════════

function BlockEditor({
  block,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  block: ContentBlock
  onUpdate: (block: ContentBlock) => void
  onRemove: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
}) {
  const blockLabel = block.type.charAt(0).toUpperCase() + block.type.slice(1)

  return (
    <div className="group relative bg-slate-50 rounded-xl p-3">
      {/* Block type label + controls */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{blockLabel}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {onMoveUp && (
            <button onClick={onMoveUp} className="p-1 hover:bg-white rounded transition-colors">
              <ChevronUp size={14} className="text-slate-400" />
            </button>
          )}
          {onMoveDown && (
            <button onClick={onMoveDown} className="p-1 hover:bg-white rounded transition-colors">
              <ChevronDown size={14} className="text-slate-400" />
            </button>
          )}
          <button onClick={onRemove} className="p-1 hover:bg-red-50 rounded transition-colors">
            <X size={14} className="text-red-400" />
          </button>
        </div>
      </div>

      {/* Block-type-specific editors */}
      {block.type === 'heading' && (
        <div className="space-y-2">
          <select
            value={block.level || 2}
            onChange={(e) => onUpdate({ ...block, level: parseInt(e.target.value) as 1 | 2 | 3 })}
            className="text-xs border rounded-lg px-2 py-1"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <SegmentsEditor
            segments={block.segments}
            onUpdate={(segments) => onUpdate({ ...block, segments })}
            placeholder="Heading text..."
          />
        </div>
      )}

      {block.type === 'paragraph' && (
        <SegmentsEditor
          segments={block.segments}
          onUpdate={(segments) => onUpdate({ ...block, segments })}
          placeholder="Paragraph text..."
        />
      )}

      {block.type === 'image' && (
        <div className="space-y-2">
          <input
            type="text"
            value={block.src}
            onChange={(e) => onUpdate({ ...block, src: e.target.value })}
            placeholder="Image URL or emoji:🎯"
            className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30"
          />
          <input
            type="text"
            value={block.caption || ''}
            onChange={(e) => onUpdate({ ...block, caption: e.target.value || undefined })}
            placeholder="Caption (optional)"
            className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30"
          />
        </div>
      )}

      {block.type === 'math' && (
        <div className="space-y-2">
          <input
            type="text"
            value={block.latex}
            onChange={(e) => onUpdate({ ...block, latex: e.target.value })}
            placeholder="LaTeX equation, e.g. E = mc^2"
            className="w-full text-sm font-mono border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30"
          />
          <input
            type="text"
            value={block.caption || ''}
            onChange={(e) => onUpdate({ ...block, caption: e.target.value || undefined })}
            placeholder="Caption (optional)"
            className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30"
          />
        </div>
      )}

      {block.type === 'callout' && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <select
              value={block.style}
              onChange={(e) => onUpdate({ ...block, style: e.target.value as any })}
              className="text-xs border rounded-lg px-2 py-1"
            >
              <option value="info">Info</option>
              <option value="tip">Tip</option>
              <option value="warning">Warning</option>
              <option value="example">Example</option>
            </select>
            <input
              type="text"
              value={block.title || ''}
              onChange={(e) => onUpdate({ ...block, title: e.target.value || undefined })}
              placeholder="Title (optional)"
              className="flex-1 text-sm border rounded-lg px-3 py-1 outline-none focus:ring-2 focus:ring-bloom-orange/30"
            />
          </div>
          <SegmentsEditor
            segments={block.segments}
            onUpdate={(segments) => onUpdate({ ...block, segments })}
            placeholder="Callout content..."
          />
        </div>
      )}

      {block.type === 'bulletList' && (
        <BulletListEditor
          items={block.items}
          onUpdate={(items) => onUpdate({ ...block, items })}
        />
      )}

      {(block.type === 'divider' || block.type === 'spacer') && (
        <div className="text-xs text-slate-400 text-center py-1">
          {block.type === 'divider' ? '— Horizontal Divider —' : `Spacer (${(block as any).size || 'md'})`}
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Text Segments Editor (simplified rich text)
// ═══════════════════════════════════════════════════════

function SegmentsEditor({
  segments,
  onUpdate,
  placeholder,
}: {
  segments: TextSegment[]
  onUpdate: (segments: TextSegment[]) => void
  placeholder?: string
}) {
  // Simplified: edit as plain text, preserve first segment's formatting
  const text = segments.map(s => s.text).join('')

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const newText = e.target.value
    if (segments.length === 0 || segments.length === 1) {
      onUpdate([{ ...segments[0], text: newText }])
    } else {
      // When editing, collapse to single segment
      onUpdate([{ text: newText }])
    }
  }

  return (
    <textarea
      value={text}
      onChange={handleChange}
      placeholder={placeholder}
      rows={Math.max(2, Math.ceil(text.length / 60))}
      className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30 resize-none"
    />
  )
}

// ═══════════════════════════════════════════════════════
//  Bullet List Editor
// ═══════════════════════════════════════════════════════

function BulletListEditor({
  items,
  onUpdate,
}: {
  items: TextSegment[][]
  onUpdate: (items: TextSegment[][]) => void
}) {
  function updateItem(index: number, text: string) {
    const newItems = [...items]
    newItems[index] = [{ text }]
    onUpdate(newItems)
  }

  function addItem() {
    onUpdate([...items, [{ text: '' }]])
  }

  function removeItem(index: number) {
    onUpdate(items.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2">
          <span className="mt-2.5 w-2 h-2 rounded-full bg-bloom-orange flex-shrink-0" />
          <input
            type="text"
            value={item.map(s => s.text).join('')}
            onChange={(e) => updateItem(i, e.target.value)}
            placeholder={`Item ${i + 1}`}
            className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30"
          />
          <button onClick={() => removeItem(i)} className="p-1 mt-1 hover:bg-red-50 rounded">
            <X size={14} className="text-red-400" />
          </button>
        </div>
      ))}
      <button
        onClick={addItem}
        className="text-xs text-bloom-orange font-medium hover:underline"
      >
        + Add item
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Question Editor
// ═══════════════════════════════════════════════════════

function QuestionEditor({
  data,
  onUpdate,
}: {
  data: Extract<ContentData, { type: 'question' }>
  onUpdate: (data: ContentData) => void
}) {
  function updateField<K extends keyof typeof data>(key: K, value: (typeof data)[K]) {
    onUpdate({ ...data, [key]: value })
  }

  function updateOption(index: number, text: string) {
    const newOptions = [...data.options]
    newOptions[index] = text
    updateField('options', newOptions)
  }

  function addOption() {
    updateField('options', [...data.options, ''])
  }

  function removeOption(index: number) {
    const newOptions = data.options.filter((_, i) => i !== index)
    updateField('options', newOptions)
    if (data.correctIndex >= newOptions.length) {
      updateField('correctIndex', 0)
    }
  }

  return (
    <div className="space-y-3">
      <textarea
        value={data.question}
        onChange={(e) => {
          onUpdate({
            ...data,
            question: e.target.value,
            questionSegments: [{ text: e.target.value }],
          })
        }}
        placeholder="Question text..."
        rows={2}
        className="w-full text-sm font-medium border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30 resize-none"
      />

      <div className="space-y-2">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Options</span>
        {data.options.map((option, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => updateField('correctIndex', i)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 transition-colors ${
                data.correctIndex === i
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}
            >
              {String.fromCharCode(65 + i)}
            </button>
            <input
              type="text"
              value={option}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Option ${String.fromCharCode(65 + i)}`}
              className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30"
            />
            {data.options.length > 2 && (
              <button onClick={() => removeOption(i)} className="p-1 hover:bg-red-50 rounded">
                <X size={14} className="text-red-400" />
              </button>
            )}
          </div>
        ))}
        {data.options.length < 6 && (
          <button
            onClick={addOption}
            className="text-xs text-bloom-orange font-medium hover:underline"
          >
            + Add option
          </button>
        )}
      </div>

      <textarea
        value={data.explanation || ''}
        onChange={(e) => {
          onUpdate({
            ...data,
            explanation: e.target.value,
            explanationSegments: [{ text: e.target.value }],
          })
        }}
        placeholder="Explanation (shown after correct answer)..."
        rows={2}
        className="w-full text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-bloom-orange/30 resize-none"
      />
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Sources Editor
// ═══════════════════════════════════════════════════════

function SourcesEditor({
  sources,
  onUpdate,
}: {
  sources: SourceReference[]
  onUpdate: (sources: SourceReference[]) => void
}) {
  function addSource() {
    onUpdate([...sources, { title: '', url: '', description: '' }])
  }

  function updateSource(index: number, field: keyof SourceReference, value: string) {
    const newSources = [...sources]
    newSources[index] = { ...newSources[index], [field]: value }
    onUpdate(newSources)
  }

  function removeSource(index: number) {
    onUpdate(sources.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sources</span>
      {sources.map((source, i) => (
        <div key={i} className="flex gap-2">
          <div className="flex-1 space-y-1">
            <input
              type="text"
              value={source.title}
              onChange={(e) => updateSource(i, 'title', e.target.value)}
              placeholder="Source title"
              className="w-full text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-bloom-orange/30"
            />
            <input
              type="text"
              value={source.url || ''}
              onChange={(e) => updateSource(i, 'url', e.target.value)}
              placeholder="URL (optional)"
              className="w-full text-xs border rounded-lg px-2 py-1.5 outline-none focus:ring-2 focus:ring-bloom-orange/30"
            />
          </div>
          <button onClick={() => removeSource(i)} className="p-1 hover:bg-red-50 rounded self-start">
            <X size={14} className="text-red-400" />
          </button>
        </div>
      ))}
      <button
        onClick={addSource}
        className="text-xs text-bloom-orange font-medium hover:underline"
      >
        + Add source
      </button>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Block Palette Bottom Sheet
// ═══════════════════════════════════════════════════════

function BlockPaletteSheet({
  onSelect,
  onClose,
}: {
  onSelect: (data: ContentData) => void
  onClose: () => void
}) {
  const pageTypes = [
    { label: 'Content Page', description: 'Rich text with headings, images, and more', icon: Type, type: 'page' as const },
    { label: 'Question', description: 'Multiple choice quiz question', icon: HelpCircle, type: 'question' as const },
  ]

  function handleSelect(type: 'page' | 'question') {
    if (type === 'page') {
      onSelect({
        type: 'page',
        blocks: [
          { type: 'heading', segments: [{ text: '' }], level: 2 },
          { type: 'paragraph', segments: [{ text: '' }] },
        ],
      })
    } else {
      onSelect({
        type: 'question',
        question: '',
        questionSegments: [{ text: '' }],
        options: ['', '', '', ''],
        correctIndex: 0,
        explanation: '',
        explanationSegments: [{ text: '' }],
      })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-white rounded-t-3xl p-6 animate-slide-up" style={{ paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom, 2.5rem))' }}>
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
        <h3 className="font-bold text-lg text-bloom-text mb-3">Add Page</h3>
        <div className="space-y-3 overflow-y-auto max-h-[60vh]">
          {pageTypes.map(pt => (
            <button
              key={pt.type}
              onClick={() => handleSelect(pt.type)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-bloom-orange hover:bg-orange-50/30 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                <pt.icon size={24} className="text-bloom-text-secondary" />
              </div>
              <div>
                <span className="font-semibold text-bloom-text">{pt.label}</span>
                <p className="text-sm text-bloom-text-muted">{pt.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  AI Draft Dialog
// ═══════════════════════════════════════════════════════

function AIDraftDialog({
  onGenerated,
  onClose,
}: {
  onGenerated: (pages: ContentData[]) => void
  onClose: () => void
}) {
  const [topic, setTopic] = useState('')
  const [pageCount, setPageCount] = useState(8)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    if (!topic.trim()) return
    setIsGenerating(true)
    setError(null)

    try {
      const { pages } = await api.generateAIDraft(topic.trim(), pageCount)
      onGenerated(pages)
    } catch (err: any) {
      setError(err.message || 'Failed to generate lesson')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-pop-in">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <h3 className="font-bold text-lg text-bloom-text">AI Lesson Generator</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-bloom-text-secondary block mb-1">Topic</label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Introduction to Quantum Computing, The History of Jazz, How Neural Networks Work..."
              rows={3}
              className="w-full text-sm border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300 resize-none"
              disabled={isGenerating}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-bloom-text-secondary block mb-1">
              Pages: {pageCount}
            </label>
            <input
              type="range"
              min={4}
              max={15}
              value={pageCount}
              onChange={(e) => setPageCount(parseInt(e.target.value))}
              className="w-full accent-purple-500"
              disabled={isGenerating}
            />
            <div className="flex justify-between text-xs text-bloom-text-muted">
              <span>4 (quick)</span>
              <span>15 (detailed)</span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          <Button
            color="orange"
            onClick={handleGenerate}
            disabled={!topic.trim() || isGenerating}
            className="w-full !py-3"
            style={{ background: 'linear-gradient(135deg, #9333ea, #4f46e5)' }}
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Generating lesson...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Generate Lesson</span>
              </>
            )}
          </Button>

          {isGenerating && (
            <p className="text-xs text-center text-bloom-text-muted">
              This may take 15-30 seconds...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Preview Overlay — mirrors the real LessonPage exactly
// ═══════════════════════════════════════════════════════

const PULL_THRESHOLD = 120

function PreviewOverlay({
  pages,
  pageIndex,
  onClose,
  onChangeIndex,
}: {
  pages: PageDraft[]
  pageIndex: number
  onClose: () => void
  onChangeIndex: (index: number) => void
}) {
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)

  // Pull-to-advance state
  const [pullDistance, setPullDistance] = useState(0)
  const [scrollDir, setScrollDir] = useState<'forward' | 'backward'>('forward')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pageAnim, setPageAnim] = useState<'idle' | 'exit' | 'enter'>('enter')
  const [confirmed, setConfirmed] = useState(false)
  const [animDir, setAnimDir] = useState<'forward' | 'backward'>('forward')

  const containerRef = useRef<HTMLDivElement>(null)
  const isTransitioningRef = useRef(false)
  const canAdvanceRef = useRef(false)
  const canGoBackRef = useRef(false)
  const doAdvanceRef = useRef<() => void>(() => {})
  const doGoBackRef = useRef<() => void>(() => {})
  const pullDistanceRef = useRef(0)
  const scrollDirRef = useRef<'forward' | 'backward'>('forward')
  const wheelAccumRef = useRef(0)
  const wheelDirRef = useRef<'forward' | 'backward'>('forward')
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout>>()

  const data = pages[pageIndex]?.contentData
  const isLast = pageIndex >= pages.length - 1
  const isFirst = pageIndex === 0
  const isQuestion = data?.type === 'question'
  const canContinue = !isQuestion || isCorrect === true
  const progress = (pageIndex + 1) / pages.length
  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1)

  canAdvanceRef.current = canContinue && !isTransitioningRef.current
  canGoBackRef.current = !isFirst && !isTransitioningRef.current
  pullDistanceRef.current = pullDistance
  scrollDirRef.current = scrollDir

  // Lock body scroll while preview is open
  useEffect(() => {
    const prev = document.body.style.overflow
    const prevHeight = document.body.style.height
    const prevPosition = document.body.style.position
    document.body.style.overflow = 'hidden'
    document.body.style.height = '100%'
    document.body.style.position = 'fixed'
    document.body.style.width = '100%'
    document.documentElement.style.overflow = 'hidden'

    const t = setTimeout(() => setPageAnim('idle'), 420)

    return () => {
      document.body.style.overflow = prev
      document.body.style.height = prevHeight
      document.body.style.position = prevPosition
      document.body.style.width = ''
      document.documentElement.style.overflow = ''
      clearTimeout(t)
    }
  }, [])

  // Advance to next page
  const doAdvance = useCallback(async () => {
    if (isTransitioningRef.current) return
    isTransitioningRef.current = true
    setIsTransitioning(true)
    wheelAccumRef.current = 0

    setAnimDir('forward')
    setConfirmed(true)

    setPageAnim('exit')
    await new Promise(r => setTimeout(r, 350))
    setPullDistance(0)

    if (isLast) {
      // In preview, just close
      onClose()
      return
    }

    onChangeIndex(pageIndex + 1)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setShowExplanation(false)

    if (containerRef.current) containerRef.current.scrollTop = 0

    setConfirmed(false)
    setPageAnim('enter')
    await new Promise(r => setTimeout(r, 380))
    setPageAnim('idle')
    setScrollDir('forward')
    isTransitioningRef.current = false
    setIsTransitioning(false)
  }, [isLast, pageIndex, onChangeIndex, onClose])

  // Go back to previous page
  const doGoBack = useCallback(async () => {
    if (isTransitioningRef.current || isFirst) return
    isTransitioningRef.current = true
    setIsTransitioning(true)
    wheelAccumRef.current = 0

    setAnimDir('backward')
    setConfirmed(true)

    setPageAnim('exit')
    await new Promise(r => setTimeout(r, 350))
    setPullDistance(0)

    onChangeIndex(pageIndex - 1)
    setSelectedAnswer(null)
    setIsCorrect(null)
    setShowExplanation(false)

    if (containerRef.current) containerRef.current.scrollTop = 0

    setConfirmed(false)
    setPageAnim('enter')
    await new Promise(r => setTimeout(r, 380))
    setPageAnim('idle')
    setScrollDir('forward')
    isTransitioningRef.current = false
    setIsTransitioning(false)
  }, [isFirst, pageIndex, onChangeIndex])

  doAdvanceRef.current = doAdvance
  doGoBackRef.current = doGoBack

  // Answer selection
  function handleAnswerSelect(index: number) {
    if (selectedAnswer !== null) return
    setSelectedAnswer(index)
    if (data?.type === 'question') {
      const qData = data as any
      const correct = index === qData.correctIndex
      setIsCorrect(correct)
      if (correct) {
        setTimeout(() => setShowExplanation(true), 600)
      } else {
        setTimeout(() => {
          setSelectedAnswer(null)
          setIsCorrect(null)
        }, 1400)
      }
    }
  }

  // Auto-scroll to explanation
  useEffect(() => {
    if (showExplanation && containerRef.current) {
      setTimeout(() => {
        containerRef.current?.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior: 'smooth',
        })
      }, 100)
    }
  }, [showExplanation])

  // Reset answer state when page changes
  useEffect(() => {
    setSelectedAnswer(null)
    setIsCorrect(null)
    setShowExplanation(false)
  }, [pageIndex])

  // Horizontal swipe for page navigation
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let hSwipeStartX: number | null = null
    let hSwipeStartY: number | null = null
    let hSwipeActive = false
    let hSwipeDir: 'forward' | 'backward' | null = null

    const H_SWIPE_THRESHOLD = 80

    let hTouchInsideInteractive = false

    const onHTouchStart = (e: TouchEvent) => {
      if (isTransitioningRef.current) return
      const target = e.target as HTMLElement
      hTouchInsideInteractive = !!target.closest?.('[data-interactive]')
      hSwipeStartX = e.touches[0].clientX
      hSwipeStartY = e.touches[0].clientY
      hSwipeActive = false
      hSwipeDir = null
    }

    const onHTouchMove = (e: TouchEvent) => {
      if (hTouchInsideInteractive) return
      if (hSwipeStartX === null || hSwipeStartY === null || isTransitioningRef.current) return
      const dx = e.touches[0].clientX - hSwipeStartX // positive = swipe right (back), negative = swipe left (forward)
      const dy = Math.abs(hSwipeStartY - e.touches[0].clientY)

      if (!hSwipeActive && Math.abs(dx) > 20 && Math.abs(dx) > dy * 1.5) {
        hSwipeActive = true
        if (dx > 0 && canGoBackRef.current) {
          hSwipeDir = 'backward'
        } else if (dx < 0 && canAdvanceRef.current) {
          hSwipeDir = 'forward'
        } else {
          hSwipeDir = null
        }
      }

      if (hSwipeActive && hSwipeDir) {
        e.preventDefault()
        const absDx = Math.abs(dx)
        const progress = Math.min(1, absDx / H_SWIPE_THRESHOLD)
        setPullDistance(progress * PULL_THRESHOLD)
        setScrollDir(hSwipeDir)
        if (absDx >= H_SWIPE_THRESHOLD) {
          hSwipeStartX = null
          hSwipeActive = false
          if (hSwipeDir === 'forward') {
            doAdvanceRef.current()
          } else {
            doGoBackRef.current()
          }
          hSwipeDir = null
        }
      }
    }

    const onHTouchEnd = () => {
      if (hSwipeActive && pullDistanceRef.current > 0 && pullDistanceRef.current < PULL_THRESHOLD) {
        setPullDistance(0)
      }
      hSwipeStartX = null
      hSwipeStartY = null
      hSwipeActive = false
      hSwipeDir = null
      hTouchInsideInteractive = false
    }

    el.addEventListener('touchstart', onHTouchStart, { passive: true })
    el.addEventListener('touchmove', onHTouchMove, { passive: false })
    el.addEventListener('touchend', onHTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onHTouchStart)
      el.removeEventListener('touchmove', onHTouchMove)
      el.removeEventListener('touchend', onHTouchEnd)
    }
  }, [])

  // Touch & Wheel gesture handlers (same as LessonPage)
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    let touchStartY: number | null = null
    let touchDir: 'forward' | 'backward' | null = null

    const isAtBottom = () =>
      el.scrollHeight - el.scrollTop - el.clientHeight < 5

    const isAtTop = () =>
      el.scrollTop < 5

    const onTouchStart = (e: TouchEvent) => {
      if (isTransitioningRef.current) return
      touchStartY = e.touches[0].clientY
      touchDir = null
    }

    const onTouchMove = (e: TouchEvent) => {
      if (touchStartY === null || isTransitioningRef.current) return
      const delta = touchStartY - e.touches[0].clientY

      if (touchDir === null) {
        if (delta > 10 && isAtBottom() && canAdvanceRef.current) {
          touchDir = 'forward'
        } else if (delta < -10 && isAtTop() && canGoBackRef.current) {
          touchDir = 'backward'
        } else {
          return
        }
      }

      if (touchDir === 'forward') {
        if (!canAdvanceRef.current || !isAtBottom()) {
          if (pullDistanceRef.current > 0) { setPullDistance(0); setScrollDir('forward') }
          return
        }
        e.preventDefault()
        const dist = Math.max(0, delta - 10)
        setPullDistance(dist)
        setScrollDir('forward')
        if (dist >= PULL_THRESHOLD) {
          touchStartY = null
          touchDir = null
          doAdvanceRef.current()
        }
      } else if (touchDir === 'backward') {
        if (!canGoBackRef.current || !isAtTop()) {
          if (pullDistanceRef.current > 0) { setPullDistance(0); setScrollDir('forward') }
          return
        }
        e.preventDefault()
        const dist = Math.max(0, -delta - 10)
        setPullDistance(dist)
        setScrollDir('backward')
        if (dist >= PULL_THRESHOLD) {
          touchStartY = null
          touchDir = null
          doGoBackRef.current()
        }
      }
    }

    const onTouchEnd = () => {
      if (pullDistanceRef.current > 0 && pullDistanceRef.current < PULL_THRESHOLD) {
        setPullDistance(0)
      }
      touchStartY = null
      touchDir = null
    }

    const onWheel = (e: WheelEvent) => {
      if (isTransitioningRef.current) return

      const scrollingDown = e.deltaY > 0
      const scrollingUp = e.deltaY < 0

      if (scrollingDown && isAtBottom() && canAdvanceRef.current) {
        if (wheelDirRef.current === 'backward') {
          wheelAccumRef.current = 0
          setPullDistance(0)
        }
        wheelDirRef.current = 'forward'
        setScrollDir('forward')

        e.preventDefault()
        wheelAccumRef.current += e.deltaY * 1.2
        wheelAccumRef.current = Math.max(0, wheelAccumRef.current)
        setPullDistance(wheelAccumRef.current)

        if (wheelAccumRef.current >= PULL_THRESHOLD) {
          wheelAccumRef.current = 0
          doAdvanceRef.current()
          return
        }

        if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
        wheelTimeoutRef.current = setTimeout(() => {
          wheelAccumRef.current = 0
          setPullDistance(0)
        }, 400)
        return
      }

      if (scrollingUp && isAtTop() && canGoBackRef.current) {
        if (wheelDirRef.current === 'forward') {
          wheelAccumRef.current = 0
          setPullDistance(0)
        }
        wheelDirRef.current = 'backward'
        setScrollDir('backward')

        e.preventDefault()
        wheelAccumRef.current += Math.abs(e.deltaY) * 1.2
        wheelAccumRef.current = Math.max(0, wheelAccumRef.current)
        setPullDistance(wheelAccumRef.current)

        if (wheelAccumRef.current >= PULL_THRESHOLD) {
          wheelAccumRef.current = 0
          doGoBackRef.current()
          return
        }

        if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
        wheelTimeoutRef.current = setTimeout(() => {
          wheelAccumRef.current = 0
          setPullDistance(0)
        }, 400)
        return
      }

      if (wheelAccumRef.current > 0) {
        if ((wheelDirRef.current === 'forward' && scrollingUp) ||
            (wheelDirRef.current === 'backward' && scrollingDown)) {
          wheelAccumRef.current = Math.max(0, wheelAccumRef.current - Math.abs(e.deltaY) * 0.5)
          setPullDistance(wheelAccumRef.current)
          if (wheelAccumRef.current <= 0) {
            wheelAccumRef.current = 0
            setPullDistance(0)
          }
        }
      }

      // Horizontal scroll (trackpad swipe left/right)
      const scrollingLeft = e.deltaX < 0
      const scrollingRight = e.deltaX > 0

      if (scrollingRight && canAdvanceRef.current && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (wheelDirRef.current === 'backward') {
          wheelAccumRef.current = 0
          setPullDistance(0)
        }
        wheelDirRef.current = 'forward'
        setScrollDir('forward')

        e.preventDefault()
        wheelAccumRef.current += Math.abs(e.deltaX) * 1.2
        wheelAccumRef.current = Math.max(0, wheelAccumRef.current)
        setPullDistance(wheelAccumRef.current)

        if (wheelAccumRef.current >= PULL_THRESHOLD) {
          wheelAccumRef.current = 0
          doAdvanceRef.current()
          return
        }

        if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
        wheelTimeoutRef.current = setTimeout(() => {
          wheelAccumRef.current = 0
          setPullDistance(0)
        }, 400)
        return
      }

      if (scrollingLeft && canGoBackRef.current && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (wheelDirRef.current === 'forward') {
          wheelAccumRef.current = 0
          setPullDistance(0)
        }
        wheelDirRef.current = 'backward'
        setScrollDir('backward')

        e.preventDefault()
        wheelAccumRef.current += Math.abs(e.deltaX) * 1.2
        wheelAccumRef.current = Math.max(0, wheelAccumRef.current)
        setPullDistance(wheelAccumRef.current)

        if (wheelAccumRef.current >= PULL_THRESHOLD) {
          wheelAccumRef.current = 0
          doGoBackRef.current()
          return
        }

        if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
        wheelTimeoutRef.current = setTimeout(() => {
          wheelAccumRef.current = 0
          setPullDistance(0)
        }, 400)
        return
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('wheel', onWheel)
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      } else if ((e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown' || e.key === 'ArrowRight') && canAdvanceRef.current) {
        e.preventDefault()
        doAdvanceRef.current()
      } else if ((e.key === 'ArrowUp' || e.key === 'ArrowLeft') && canGoBackRef.current) {
        e.preventDefault()
        doGoBackRef.current()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  // Content animation styles (same as LessonPage)
  const contentStyle = (() => {
    const isForward = animDir === 'forward'

    if (pageAnim === 'exit') {
      if (isForward) {
        const currentOffset = pullProgress * 24
        return {
          transform: `translateY(${-(currentOffset + 60)}px) scale(0.96)`,
          opacity: 0,
          transition: 'transform 0.3s ease-in, opacity 0.25s ease-in',
        }
      } else {
        const currentOffset = pullProgress * 24
        return {
          transform: `translateY(${currentOffset + 60}px) scale(0.96)`,
          opacity: 0,
          transition: 'transform 0.3s ease-in, opacity 0.25s ease-in',
        }
      }
    }
    if (pageAnim === 'enter') {
      return {
        transform: undefined as string | undefined,
        opacity: 1,
        transition: undefined as string | undefined,
      }
    }
    if (pullProgress > 0) {
      const dir = scrollDir === 'forward' ? -1 : 1
      return {
        transform: `translateY(${dir * pullProgress * 24}px) scale(${1 - pullProgress * 0.015})`,
        opacity: pullProgress > 0.85 ? 1 - (pullProgress - 0.85) * 4 : 1,
        transition: 'none',
      }
    }
    return {
      transform: undefined as string | undefined,
      opacity: 1,
      transition: 'transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease',
    }
  })()

  const enterClass = pageAnim === 'enter'
    ? (animDir === 'forward' ? 'lesson-page-enter' : 'lesson-page-enter-reverse')
    : ''

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-hidden z-50" style={{ height: '100dvh', overscrollBehavior: 'none' }}>
      {/* Header — matches LessonPage */}
      <header className="flex-shrink-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <X size={24} className="text-bloom-text" />
          </button>
          <div className="flex-1">
            <ProgressBar progress={progress} color="green" animated />
          </div>
          <div className="px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200/50">
            <span className="text-xs font-semibold text-purple-600">Preview</span>
          </div>
        </div>
      </header>

      {/* Content area — matches LessonPage */}
      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto relative"
        style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'none' }}
      >
        <div
          className={`min-h-full flex flex-col px-6 md:px-8 ${enterClass}`}
          style={contentStyle}
        >
          <div className="flex-1 min-h-[24px]" />
          <div className="max-w-2xl w-full mx-auto">
            {data && (
              <PreviewPageContent
                data={data}
                selectedAnswer={selectedAnswer}
                isCorrect={isCorrect}
                showExplanation={showExplanation}
                onAnswerSelect={handleAnswerSelect}
              />
            )}
          </div>
          <div className="flex-1 min-h-[24px]" />
        </div>

        {/* Pull-progress gradient overlay */}
        {pullProgress > 0 && (
          <div
            className="absolute inset-x-0 pointer-events-none"
            style={{
              ...(scrollDir === 'forward'
                ? { bottom: 0, height: '160px', background: `linear-gradient(to top, rgba(74, 175, 80, ${pullProgress * 0.12}), transparent)` }
                : { top: 0, height: '160px', background: `linear-gradient(to bottom, rgba(74, 144, 217, ${pullProgress * 0.12}), transparent)` }
              ),
            }}
          />
        )}
      </main>

      {/* Footer — matches LessonPage */}
      <footer className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 px-4 pt-4 pb-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between w-full">
            <span className="text-sm text-bloom-text-secondary font-medium tabular-nums">
              {pageIndex + 1} / {pages.length}
            </span>

            <PreviewMorphButton
              pullProgress={pullProgress}
              scrollDir={scrollDir}
              canContinue={canContinue}
              canGoBack={!isFirst}
              isTransitioning={isTransitioning}
              confirmed={confirmed}
              confirmedDir={animDir}
              isCorrect={isCorrect}
              isLast={isLast}
              onClickForward={() => {
                if (canAdvanceRef.current) doAdvanceRef.current()
              }}
            />
          </div>
        </div>
      </footer>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  PreviewPageContent — renders page/question content
//  (mirrors FullPageContent from LessonPage)
// ═══════════════════════════════════════════════════════

function PreviewPageContent({
  data,
  selectedAnswer,
  isCorrect,
  showExplanation,
  onAnswerSelect,
}: {
  data: ContentData
  selectedAnswer: number | null
  isCorrect: boolean | null
  showExplanation: boolean
  onAnswerSelect: (index: number) => void
}) {
  if (data.type === 'page') {
    return <RichContentRenderer blocks={data.blocks} />
  }

  if (data.type === 'question') {
    return (
      <div className="space-y-5 py-2 animate-slide-up">
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-bloom-orange/20 flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-bloom-orange font-bold text-lg">?</span>
            </div>
            <h2 className="text-xl md:text-2xl font-semibold text-white leading-snug">
              {data.questionSegments ? (
                <RichText segments={data.questionSegments} />
              ) : (
                data.question
              )}
            </h2>
          </div>
        </div>

        <div className="space-y-3">
          {data.options.map((option, index) => {
            const isSelected = selectedAnswer === index
            const isCorrectAnswer = index === data.correctIndex
            const showResult = selectedAnswer !== null

            let bgStyles = 'bg-white border-slate-200 hover:border-bloom-blue hover:shadow-md'
            let textColor = 'text-bloom-text'
            let iconElement: React.ReactNode = null

            if (showResult) {
              if (isCorrectAnswer) {
                bgStyles =
                  'bg-gradient-to-r from-emerald-50 to-green-50 border-emerald-400 shadow-emerald-100 shadow-md'
                textColor = 'text-emerald-800'
                iconElement = (
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center animate-pop-in">
                    <Check size={18} className="text-white" strokeWidth={3} />
                  </div>
                )
              } else if (isSelected) {
                bgStyles = 'bg-red-50 border-red-300'
                textColor = 'text-red-700'
                iconElement = (
                  <div className="w-8 h-8 rounded-full bg-red-400 flex items-center justify-center animate-shake">
                    <X size={18} className="text-white" strokeWidth={3} />
                  </div>
                )
              } else {
                bgStyles = 'bg-slate-50 border-slate-200 opacity-50'
              }
            }

            return (
              <button
                key={index}
                onClick={() => onAnswerSelect(index)}
                disabled={selectedAnswer !== null}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-300 ${bgStyles}`}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                      showResult && isCorrectAnswer
                        ? 'bg-emerald-500 text-white'
                        : showResult && isSelected
                        ? 'bg-red-400 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className={`flex-1 font-medium ${textColor}`}>
                    {data.optionSegments?.[index] ? (
                      <RichText segments={data.optionSegments[index]} />
                    ) : (
                      option
                    )}
                  </span>
                  {iconElement}
                </div>
              </button>
            )
          })}
        </div>

        {/* Wrong answer feedback */}
        {isCorrect === false && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 animate-slide-up">
            <p className="text-red-700 font-medium">Not quite — try again!</p>
          </div>
        )}

        {/* Correct answer explanation */}
        {showExplanation && (data.explanation || data.explanationSegments) && (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center">
                <Lightbulb size={22} className="text-white" />
              </div>
              <span className="font-bold text-amber-900 text-lg">Great insight!</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              {data.explanationSegments ? (
                <RichText segments={data.explanationSegments} />
              ) : (
                data.explanation
              )}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Legacy text
  if (data.type === 'text') {
    const isBold = data.formatting?.bold
    return (
      <div className={`py-4 animate-slide-up ${isBold ? 'text-center py-6' : ''}`}>
        {isBold ? (
          <>
            <h2 className="font-bold text-bloom-text leading-tight text-2xl md:text-3xl">
              {data.text}
            </h2>
            <div className="h-1 w-20 bg-gradient-to-r from-bloom-orange to-bloom-yellow rounded-full mx-auto mt-6" />
          </>
        ) : (
          <p className="text-xl md:text-2xl leading-relaxed text-bloom-text text-center">
            {data.text}
          </p>
        )}
      </div>
    )
  }

  // Fallback
  return (
    <div className="flex items-center justify-center py-4 animate-slide-up">
      <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 w-full max-w-sm shadow-xl">
        <div className="text-center text-white">
          <Sparkles size={40} className="mx-auto mb-4" />
          <p className="font-semibold text-xl">Interactive Component</p>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  PreviewMorphButton — mirrors MorphButton from LessonPage
// ═══════════════════════════════════════════════════════

function PreviewMorphButton({
  pullProgress,
  scrollDir,
  canContinue,
  canGoBack,
  isTransitioning,
  confirmed,
  isLast,
  onClickForward,
}: {
  pullProgress: number
  scrollDir: 'forward' | 'backward'
  canContinue: boolean
  canGoBack: boolean
  isTransitioning: boolean
  confirmed: boolean
  confirmedDir: 'forward' | 'backward'
  isCorrect: boolean | null
  isLast: boolean
  onClickForward: () => void
}) {
  const isForward = scrollDir === 'forward'
  const activePull = isForward
    ? (canContinue ? pullProgress : 0)
    : (canGoBack ? pullProgress : 0)
  const pastThreshold = activePull >= 1

  const disabled = isForward
    ? (!canContinue || isTransitioning)
    : (!canGoBack || isTransitioning)

  // Dimensions
  const minW = 130
  const maxW = 56
  const width = minW - activePull * (minW - maxW)
  const borderRadius = 16 + activePull * 12

  // Colors
  const forwardBg = pastThreshold ? '#22c55e' : `color-mix(in srgb, #22c55e ${50 + activePull * 50}%, #94a3b8)`
  const backwardBg = pastThreshold ? '#3b82f6' : `color-mix(in srgb, #3b82f6 ${50 + activePull * 50}%, #94a3b8)`
  const activeBg = isForward ? forwardBg : backwardBg

  // Opacity
  const textOpacity = confirmed ? 0 : Math.max(0, 1 - activePull * 3)
  const iconOpacity = confirmed ? 1 : activePull > 0.2 ? Math.min(1, (activePull - 0.2) * 2.5) : 0

  const transformOrigin = isForward ? 'right center' : 'left center'

  return (
    <button
      onClick={onClickForward}
      disabled={disabled}
      className={`relative overflow-hidden text-white font-semibold flex-shrink-0
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${!confirmed && !isTransitioning ? 'active:scale-95' : ''}
        ${pastThreshold && isForward ? 'shadow-lg shadow-emerald-400/50' : ''}
        ${pastThreshold && !isForward ? 'shadow-lg shadow-blue-400/50' : ''}
        ${!pastThreshold ? 'shadow-sm' : ''}`}
      style={{
        width: `${width}px`,
        height: '48px',
        borderRadius: `${borderRadius}px`,
        backgroundColor: activeBg,
        transformOrigin,
        transition: confirmed
          ? 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
          : activePull > 0
            ? 'background-color 0.15s, box-shadow 0.15s'
            : 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Label */}
      <span
        className="absolute inset-0 flex items-center justify-center gap-2"
        style={{
          opacity: textOpacity,
          transition: confirmed ? 'opacity 0.15s' : undefined,
        }}
      >
        {isLast ? 'Complete' : 'Continue'}
        <ChevronRight size={18} />
      </span>

      {/* Confirmed / pull icon */}
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{
          opacity: iconOpacity,
          transform: confirmed ? 'scale(1.15)' : 'scale(1)',
          transition: confirmed ? 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
        }}
      >
        {pastThreshold ? (
          isForward ? <Check size={22} strokeWidth={3} /> : <ChevronLeft size={22} strokeWidth={3} />
        ) : (
          isForward ? <ChevronDown size={22} /> : <ChevronUp size={22} />
        )}
      </span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════
//  Helpers
// ═══════════════════════════════════════════════════════

function createEmptyBlock(type: ContentBlock['type']): ContentBlock {
  switch (type) {
    case 'heading':
      return { type: 'heading', segments: [{ text: '' }], level: 2 }
    case 'paragraph':
      return { type: 'paragraph', segments: [{ text: '' }] }
    case 'image':
      return { type: 'image', src: 'emoji:📚', caption: '' }
    case 'math':
      return { type: 'math', latex: '', caption: '' }
    case 'callout':
      return { type: 'callout', style: 'tip', title: '', segments: [{ text: '' }] }
    case 'bulletList':
      return { type: 'bulletList', items: [[{ text: '' }]] }
    case 'divider':
      return { type: 'divider' }
    case 'spacer':
      return { type: 'spacer', size: 'md' }
    case 'animation':
      return { type: 'animation', src: '', caption: '' }
    case 'interactive':
      return { type: 'interactive', componentId: '' }
    default:
      return { type: 'paragraph', segments: [{ text: '' }] }
  }
}

function getPagePreview(data: ContentData): string {
  if (data.type === 'question') {
    return (data as any).question?.substring(0, 60) || ''
  }
  if (data.type === 'page') {
    const blocks = (data as any).blocks as ContentBlock[]
    for (const block of blocks) {
      if ('segments' in block && Array.isArray(block.segments)) {
        const text = block.segments.map((s: TextSegment) => s.text).join('')
        if (text.trim()) return text.substring(0, 60)
      }
    }
  }
  return ''
}
