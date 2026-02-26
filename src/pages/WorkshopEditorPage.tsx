import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Save, Eye, Send, Trash2, Plus, GripVertical, ChevronDown, ChevronUp,
  Sparkles, Globe, Lock, Shield, ShieldOff, Settings, X, Loader2, Check,
  ChevronRight, ChevronLeft, BookOpen, Pencil, FileText, Lightbulb,
  Link, Upload, FileUp, AlertCircle, CheckCircle2, RefreshCw,
} from 'lucide-react'
import {
  api, LessonWithContent, ContentData,
  ContentBlock, TextSegment, SourceReference, TagInfo,
  LessonPlan, GenerationJob, GenerationSourceType,
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

  const [, setLesson] = useState<LessonWithContent | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [themeColor, setThemeColor] = useState('#FF6B35')
  const [visibility, setVisibility] = useState<'private' | 'public'>('private')
  const [editPolicy, setEditPolicy] = useState<'open' | 'approval'>('approval')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [popularTags, setPopularTags] = useState<TagInfo[]>([])
  const [modules, setModules] = useState<ModuleDraft[]>([])
  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedModule, setExpandedModule] = useState<number | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showAIDraft, setShowAIDraft] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [previewPageIndex, setPreviewPageIndex] = useState(0)
  const [savedLessonId, setSavedLessonId] = useState<string | null>(lessonId || null)
  const [moduleDragIndex, setModuleDragIndex] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Generation job state
  const [generationJob, setGenerationJob] = useState<GenerationJob | null>(null)
  const generationPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalPages = modules.reduce((sum, m) => sum + m.pages.length, 0)
  const allPagesFlat: PageDraft[] = modules.flatMap(m => m.pages)

  useEffect(() => {
    if (lessonId) {
      loadLesson(lessonId)
      // Check for an active generation job on load
      checkGenerationStatus(lessonId)
    }
    // Load popular tags for suggestions
    api.getPopularTags(30).then(res => setPopularTags(res.tags)).catch(() => {})

    return () => {
      if (generationPollRef.current) clearInterval(generationPollRef.current)
    }
  }, [lessonId])

  async function checkGenerationStatus(id: string) {
    try {
      const { job } = await api.getGenerationStatus(id)
      if (job) {
        setGenerationJob(job)
        if (job.status === 'pending' || job.status === 'planning' || job.status === 'generating') {
          startPolling(id)
        }
      }
    } catch {
      // Silently ignore — generation status is optional
    }
  }

  function startPolling(id: string) {
    if (generationPollRef.current) return // already polling
    generationPollRef.current = setInterval(async () => {
      try {
        const { job } = await api.getGenerationStatus(id)
        if (!job) return
        setGenerationJob(job)
        if (job.status === 'completed') {
          stopPolling()
          // Reload lesson to pick up generated modules
          await loadLesson(id)
        } else if (job.status === 'failed') {
          stopPolling()
        }
      } catch {
        // ignore transient errors during polling
      }
    }, 3000)
  }

  function stopPolling() {
    if (generationPollRef.current) {
      clearInterval(generationPollRef.current)
      generationPollRef.current = null
    }
  }

  // Called when a new async generation job is created from AIDraftDialog
  function handleGenerationStarted(newLessonId: string, job: GenerationJob) {
    setSavedLessonId(newLessonId)
    setGenerationJob(job)
    navigate(`/workshop/edit/${newLessonId}`, { replace: true })
    startPolling(newLessonId)
  }

  async function loadLesson(id: string) {
    try {
      setIsLoading(true)
      const { lesson } = await api.getEditableLesson(id)
      setLesson(lesson)
      setTitle(lesson.title)
      setDescription(lesson.description || '')
      setThemeColor(lesson.themeColor || '#FF6B35')
      setVisibility(lesson.visibility as 'private' | 'public')
      setEditPolicy(lesson.editPolicy as 'open' | 'approval')
      setTags(lesson.tags || [])

      if (lesson.modules && lesson.modules.length > 0) {
        setModules(lesson.modules.map(m => ({
          id: m.id,
          title: m.title,
          description: m.description || '',
          pages: (m.content || []).map(c => ({
            id: c.id,
            contentType: c.contentType,
            contentData: c.contentData,
            sources: c.sources || [],
            saved: true,
          })),
          saved: true,
        })))
      } else if (lesson.content && lesson.content.length > 0) {
        // Legacy: lesson has flat content without modules — wrap in a single module
        setModules([{
          id: null,
          title: 'Module 1',
          description: '',
          pages: lesson.content.map(c => ({
            id: c.id,
            contentType: c.contentType,
            contentData: c.contentData,
            sources: c.sources || [],
            saved: true,
          })),
          saved: false,
        }])
      }
    } catch (error) {
      console.error('Failed to load lesson:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Module management ──

  function addModule() {
    const nextNum = modules.length + 1
    setModules(prev => [...prev, {
      id: null,
      title: `Module ${nextNum}`,
      description: '',
      pages: [],
      saved: false,
    }])
    setExpandedModule(modules.length) // expand the new module
  }

  function updateModuleTitle(mIdx: number, newTitle: string) {
    setModules(prev => prev.map((m, i) => i === mIdx ? { ...m, title: newTitle, saved: false } : m))
  }

  function updateModuleDescription(mIdx: number, desc: string) {
    setModules(prev => prev.map((m, i) => i === mIdx ? { ...m, description: desc, saved: false } : m))
  }

  async function handleDeleteModule(mIdx: number) {
    const mod = modules[mIdx]
    if (mod.id && savedLessonId) {
      try {
        await api.deleteLessonModule(mod.id)
      } catch (error) {
        console.error('Failed to delete module:', error)
      }
    }
    setModules(prev => prev.filter((_, i) => i !== mIdx))
    if (expandedModule === mIdx) setExpandedModule(null)
    else if (expandedModule !== null && expandedModule > mIdx) setExpandedModule(expandedModule - 1)
  }

  async function handleDeleteLesson() {
    if (!savedLessonId) return
    setIsDeleting(true)
    try {
      await api.deleteLesson(savedLessonId)
      navigate('/workshop')
    } catch (error) {
      console.error('Failed to delete lesson:', error)
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  // Module drag reorder
  function handleModuleDragStart(index: number) { setModuleDragIndex(index) }
  function handleModuleDragOver(index: number) {
    if (moduleDragIndex === null || moduleDragIndex === index) return
    const newModules = [...modules]
    const [moved] = newModules.splice(moduleDragIndex, 1)
    newModules.splice(index, 0, { ...moved, saved: false })
    setModules(newModules)
    setModuleDragIndex(index)
  }
  function handleModuleDragEnd() { setModuleDragIndex(null) }

  // ── Save ──

  async function handleSave() {
    if (!title.trim()) return
    setIsSaving(true)

    try {
      let currentId = savedLessonId

      if (!currentId) {
        // Create new lesson
        const { lesson } = await api.createLesson({
          title: title.trim(),
          description: description.trim() || undefined,
          themeColor,
          visibility,
          editPolicy,
          tags,
        })
        currentId = lesson.id
        setSavedLessonId(lesson.id)
      } else {
        // Update lesson metadata
        await api.updateLesson(currentId, {
          title: title.trim(),
          description: description.trim() || undefined,
          themeColor,
          visibility,
          editPolicy,
          tags,
        })
      }

      // Save modules and their pages
      const updatedModules = [...modules]
      for (let mIdx = 0; mIdx < updatedModules.length; mIdx++) {
        const mod = updatedModules[mIdx]
        let moduleId = mod.id

        if (!moduleId) {
          // Create new module
          const { module } = await api.createLessonModule(currentId, {
            title: mod.title,
            description: mod.description || undefined,
          })
          moduleId = module.id
          updatedModules[mIdx] = { ...mod, id: moduleId, saved: true }
        } else if (!mod.saved) {
          // Update existing module
          await api.updateLessonModule(moduleId, {
            title: mod.title,
            description: mod.description || undefined,
          })
          updatedModules[mIdx] = { ...mod, saved: true }
        }

        // Save pages within this module
        const updatedPages = [...updatedModules[mIdx].pages]
        for (let pIdx = 0; pIdx < updatedPages.length; pIdx++) {
          const page = updatedPages[pIdx]
          if (!page.saved) {
            if (page.id) {
              // Update existing page
              await api.updateLessonContent(currentId, page.id, {
                contentType: page.contentType,
                contentData: page.contentData,
                sources: page.sources,
              })
              updatedPages[pIdx] = { ...page, saved: true }
            } else {
              // Add new page
              const { content } = await api.addLessonContent(currentId, {
                contentType: page.contentType,
                contentData: page.contentData,
                sources: page.sources,
                moduleId: moduleId!,
              })
              updatedPages[pIdx] = { ...page, id: content.id, saved: true }
            }
          }
        }
        updatedModules[mIdx] = { ...updatedModules[mIdx], pages: updatedPages }

        // Reorder pages within module
        const pageIds = updatedPages.filter(p => p.id).map(p => p.id!)
        if (pageIds.length > 0) {
          await api.reorderLessonContent(currentId, pageIds)
        }
      }

      // Reorder modules
      const moduleIds = updatedModules.filter(m => m.id).map(m => m.id!)
      if (moduleIds.length > 0) {
        await api.reorderLessonModules(currentId, moduleIds)
      }

      setModules(updatedModules.map(m => ({
        ...m,
        saved: true,
        pages: m.pages.map(p => ({ ...p, saved: true })),
      })))

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
    if (!savedLessonId && !modules.some(m => m.pages.some(p => p.id))) return

    const id = savedLessonId!
    try {
      await api.publishLesson(id)
      navigate('/workshop')
    } catch (error) {
      console.error('Failed to publish:', error)
    }
  }

  // AI Draft callback (legacy sync path — kept for plan-review flow)
  function handleAIDraftGenerated(generatedModules: ModuleDraft[], generatedTitle: string, generatedDescription: string, generatedTags?: string[]) {
    setModules(prev => [...prev, ...generatedModules])
    if (!title.trim()) setTitle(generatedTitle)
    if (!description.trim()) setDescription(generatedDescription)
    if (generatedTags && generatedTags.length > 0) {
      setTags(prev => Array.from(new Set([...prev, ...generatedTags])))
    }
    setShowAIDraft(false)
  }

  // Navigate to module editor — saves lesson first to ensure IDs exist
  async function handleEditModule(mIdx: number) {
    console.log('[handleEditModule] called with mIdx:', mIdx, 'title:', title, 'savedLessonId:', savedLessonId)

    if (!title.trim()) {
      alert('Please enter a lesson title before editing modules.')
      return
    }

    setIsSaving(true)
    try {
      let currentId: string | null = savedLessonId

      // Step 1: Ensure the lesson exists on the server
      if (!currentId) {
        console.log('[handleEditModule] Creating new lesson...')
        const resp = await api.createLesson({
          title: title.trim(),
          description: description.trim() || undefined,
          themeColor,
          visibility,
          editPolicy,
          tags,
        })
        console.log('[handleEditModule] Lesson created:', resp)
        currentId = resp.lesson.id
        setSavedLessonId(resp.lesson.id)
      } else {
        console.log('[handleEditModule] Updating lesson:', currentId)
        await api.updateLesson(currentId, {
          title: title.trim(),
          description: description.trim() || undefined,
          themeColor,
          visibility,
          editPolicy,
          tags,
        })
      }

      // Step 2: Ensure the target module has a server ID
      const mod = modules[mIdx]
      let moduleId = mod.id
      console.log('[handleEditModule] Module:', mod.title, 'existing id:', moduleId)

      if (!moduleId) {
        console.log('[handleEditModule] Creating module...')
        const resp = await api.createLessonModule(currentId!, {
          title: mod.title || 'Untitled Module',
          description: mod.description || undefined,
        })
        console.log('[handleEditModule] Module created:', resp)
        moduleId = resp.module.id
        const updatedModules = [...modules]
        updatedModules[mIdx] = { ...mod, id: moduleId, saved: true }
        setModules(updatedModules)
      }

      // Step 3: Navigate to the module editor
      const targetPath = `/workshop/edit/${currentId}/module/${moduleId}`
      console.log('[handleEditModule] Navigating to:', targetPath)
      navigate(targetPath)
    } catch (error: any) {
      console.error('[handleEditModule] Error:', error)
      alert(`Failed to save: ${error?.message || 'Unknown error'}. Please try again.`)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bloom-orange border-t-transparent" />
      </div>
    )
  }

  if (showPreview && totalPages > 0) {
    return (
      <PreviewOverlay
        pages={allPagesFlat}
        pageIndex={previewPageIndex}
        onClose={() => setShowPreview(false)}
        onChangeIndex={setPreviewPageIndex}
      />
    )
  }

  return (
    <div className="space-y-4 animate-fade-in pb-32">
      {/* Generation status banner */}
      {generationJob && (generationJob.status === 'pending' || generationJob.status === 'planning' || generationJob.status === 'generating' || generationJob.status === 'completed' || generationJob.status === 'failed') && (
        <GenerationStatusBanner
          job={generationJob}
          onDismiss={() => setGenerationJob(null)}
        />
      )}

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
          {savedLessonId && !isNew && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 hover:bg-red-50 rounded-xl transition-colors"
              title="Delete lesson"
            >
              <Trash2 size={20} className="text-red-400" />
            </button>
          )}
          {totalPages > 0 && (
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
        {/* Tags inline display */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-bloom-orange/10 text-bloom-orange text-xs font-medium"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
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

          {/* Tags */}
          <div>
            <span className="text-sm text-bloom-text-secondary block mb-2">Tags</span>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-bloom-orange/10 text-bloom-orange text-xs font-medium"
                >
                  {tag}
                  <button
                    onClick={() => setTags(prev => prev.filter(t => t !== tag))}
                    className="hover:bg-bloom-orange/20 rounded-full p-0.5 transition-colors"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagInput.trim()) {
                    e.preventDefault()
                    const newTag = tagInput.trim().toLowerCase()
                    if (!tags.includes(newTag)) {
                      setTags(prev => [...prev, newTag])
                    }
                    setTagInput('')
                  }
                }}
                placeholder="Add a tag..."
                className="flex-1 text-sm border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-bloom-orange/30"
              />
              <button
                onClick={() => {
                  if (tagInput.trim()) {
                    const newTag = tagInput.trim().toLowerCase()
                    if (!tags.includes(newTag)) {
                      setTags(prev => [...prev, newTag])
                    }
                    setTagInput('')
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-bloom-orange text-white text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Add
              </button>
            </div>
            {/* Popular tag suggestions */}
            {popularTags.length > 0 && (
              <div className="mt-2">
                <span className="text-xs text-bloom-text-muted block mb-1">Popular tags:</span>
                <div className="flex flex-wrap gap-1">
                  {popularTags
                    .filter(pt => !tags.includes(pt.tag))
                    .slice(0, 10)
                    .map(pt => (
                      <button
                        key={pt.tag}
                        onClick={() => setTags(prev => [...prev, pt.tag])}
                        className="px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs text-bloom-text-secondary transition-colors"
                      >
                        {pt.tag}
                      </button>
                    ))}
                </div>
              </div>
            )}
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
          <p className="text-xs text-purple-600">Describe a topic and AI will plan modules and generate content</p>
        </div>
      </button>

      {/* Modules Section */}
      <div className="space-y-3">
        <h3 className="font-semibold text-bloom-text flex items-center gap-2">
          <BookOpen size={18} className="text-indigo-500" />
          Modules <span className="text-sm font-normal text-bloom-text-muted">({modules.length})</span>
          {totalPages > 0 && (
            <span className="text-sm font-normal text-bloom-text-muted">· {totalPages} pages total</span>
          )}
        </h3>

        {modules.map((mod, mIdx) => (
          <div
            key={mod.id || `draft-module-${mIdx}`}
            draggable
            onDragStart={() => handleModuleDragStart(mIdx)}
            onDragOver={(e) => { e.preventDefault(); handleModuleDragOver(mIdx) }}
            onDragEnd={handleModuleDragEnd}
            className={`transition-all duration-200 ${moduleDragIndex === mIdx ? 'opacity-50 scale-95' : ''}`}
          >
            <Card className={`${!mod.saved || mod.pages.some(p => !p.saved) ? 'ring-2 ring-bloom-orange/30' : ''}`}>
              {/* Module Header */}
              <div className="flex items-center gap-2">
                <div className="p-1 cursor-grab active:cursor-grabbing text-bloom-text-muted hover:text-bloom-text-secondary touch-none">
                  <GripVertical size={18} />
                </div>

                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {mIdx + 1}
                </div>

                <button
                  onClick={() => setExpandedModule(expandedModule === mIdx ? null : mIdx)}
                  className="flex-1 text-left min-w-0"
                >
                  <span className="font-medium text-bloom-text text-sm truncate block">
                    {mod.title || 'Untitled Module'}
                  </span>
                  <span className="text-xs text-bloom-text-muted">
                    {mod.pages.length} page{mod.pages.length !== 1 ? 's' : ''}
                    {mod.description && ` · ${mod.description.substring(0, 40)}${mod.description.length > 40 ? '…' : ''}`}
                  </span>
                </button>

                <div className="flex items-center gap-1">
                  {(!mod.saved || mod.pages.some(p => !p.saved)) && (
                    <span className="w-2 h-2 rounded-full bg-bloom-orange" title="Unsaved changes" />
                  )}
                  <button
                    onClick={() => setExpandedModule(expandedModule === mIdx ? null : mIdx)}
                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {expandedModule === mIdx ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  <button
                    onClick={() => handleDeleteModule(mIdx)}
                    className="p-1 hover:bg-red-50 rounded-lg text-bloom-text-muted hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded Module Content */}
              {expandedModule === mIdx && (
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-3 animate-slide-up">
                  {/* Module title & description editing */}
                  <input
                    type="text"
                    value={mod.title}
                    onChange={e => updateModuleTitle(mIdx, e.target.value)}
                    placeholder="Module title..."
                    className="w-full text-sm font-semibold text-bloom-text border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                  <input
                    type="text"
                    value={mod.description}
                    onChange={e => updateModuleDescription(mIdx, e.target.value)}
                    placeholder="Module description (optional)..."
                    className="w-full text-sm text-bloom-text-secondary border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-300"
                  />

                  {/* Pages summary list */}
                  {mod.pages.length > 0 && (
                    <div className="space-y-1.5 pl-2 border-l-2 border-indigo-100">
                      {mod.pages.map((page, pIdx) => {
                        const preview = getPagePreview(page.contentData)
                        const isQuestion = page.contentData.type === 'question'
                        return (
                          <div
                            key={page.id || `draft-${mIdx}-${pIdx}`}
                            className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-slate-50/50"
                          >
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                              isQuestion ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {isQuestion ? '?' : <FileText size={12} />}
                            </div>
                            <span className="text-sm text-bloom-text truncate flex-1">
                              {isQuestion
                                ? `Question: ${(page.contentData as any).question?.substring(0, 50) || 'Untitled'}`
                                : preview || `Page ${pIdx + 1}`
                              }
                            </span>
                            {!page.saved && (
                              <span className="w-1.5 h-1.5 rounded-full bg-bloom-orange flex-shrink-0" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {mod.pages.length === 0 && (
                    <p className="text-sm text-bloom-text-muted text-center py-3">
                      No pages yet. Open the module editor to add pages.
                    </p>
                  )}

                  {/* Edit Module button — navigates to dedicated module editor */}
                  <button
                    onClick={() => handleEditModule(mIdx)}
                    disabled={isSaving}
                    className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all text-sm font-medium"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Pencil size={16} />}
                    <span>Edit Module Pages</span>
                  </button>
                </div>
              )}
            </Card>
          </div>
        ))}

        {/* Add Module Button */}
        <button
          onClick={addModule}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-indigo-200 text-indigo-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/30 transition-all"
        >
          <Plus size={20} />
          <span className="font-medium">Add Module</span>
        </button>
      </div>

      {/* Publish Button */}
      {totalPages > 0 && (
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

      {/* AI Draft Dialog */}
      {showAIDraft && (
        <AIDraftDialog
          currentLessonId={savedLessonId}
          onGenerated={handleAIDraftGenerated}
          onGenerationStarted={handleGenerationStarted}
          onClose={() => setShowAIDraft(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteConfirm(false)}>
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-bloom-text">Delete Lesson?</h2>
            </div>
            <p className="text-sm text-bloom-text-secondary mb-5 pl-[52px]">
              This will permanently delete <strong>"{title}"</strong> and all its content. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-bloom-text font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteLesson}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isDeleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
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

interface ModuleDraft {
  id: string | null
  title: string
  description: string
  pages: PageDraft[]
  saved: boolean
}


// ═══════════════════════════════════════════════════════
//  AI Draft Dialog — Async generation with source tabs
// ═══════════════════════════════════════════════════════

type AIDraftTab = 'topic' | 'url' | 'pdf'

function AIDraftDialog({
  currentLessonId,
  onGenerated,
  onGenerationStarted,
  onClose,
}: {
  currentLessonId: string | null
  onGenerated: (modules: ModuleDraft[], title: string, description: string, tags?: string[]) => void
  onGenerationStarted: (lessonId: string, job: GenerationJob) => void
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<AIDraftTab>('topic')
  const [topic, setTopic] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [moduleCount, setModuleCount] = useState(3)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tabs: { id: AIDraftTab; label: string; icon: React.ReactNode }[] = [
    { id: 'topic', label: 'Topic', icon: <Sparkles size={14} /> },
    { id: 'url', label: 'Website', icon: <Link size={14} /> },
    { id: 'pdf', label: 'PDF', icon: <FileUp size={14} /> },
  ]

  const canSubmit = () => {
    if (isSubmitting) return false
    if (activeTab === 'topic') return topic.trim().length > 0
    if (activeTab === 'url') return urlInput.trim().startsWith('http')
    if (activeTab === 'pdf') return pdfFile !== null
    return false
  }

  async function handleSubmit() {
    if (!canSubmit()) return
    setIsSubmitting(true)
    setError(null)

    try {
      let sourceType: GenerationSourceType = 'topic'
      let sourceContent: string | undefined
      let topicText = topic.trim()

      if (activeTab === 'url') {
        sourceType = 'url'
        sourceContent = urlInput.trim() // send URL — server will fetch it
        topicText = urlInput.trim()
      } else if (activeTab === 'pdf' && pdfFile) {
        sourceType = 'pdf'
        topicText = pdfFile.name.replace(/\.pdf$/i, '')
        // pdfFile is passed directly as binary — no base64 conversion needed
      }

      const { lessonId, jobId } = await api.startAIGeneration({
        topic: topicText || 'Lesson from source material',
        moduleCount,
        sourceType,
        pdfFile: activeTab === 'pdf' ? pdfFile ?? undefined : undefined,
        sourceContent,
        lessonId: currentLessonId ?? undefined,
      })

      // Build a synthetic job object so we can show the banner immediately
      const job: GenerationJob = {
        id: jobId,
        lessonId,
        userId: '',
        status: 'pending',
        totalModules: moduleCount,
        completedModules: 0,
        currentModuleTitle: null,
        sourceType,
        error: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      onGenerationStarted(lessonId, job)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Failed to start generation')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl animate-pop-in max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
              <Sparkles size={20} className="text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-bloom-text leading-tight">AI Lesson Generator</h3>
              <p className="text-xs text-bloom-text-muted">Generation runs in the background</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Source Type Tabs */}
        <div className="flex bg-slate-100 rounded-xl p-1 mb-5">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setError(null) }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white shadow-sm text-bloom-text'
                  : 'text-bloom-text-muted hover:text-bloom-text-secondary'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {/* Topic Tab */}
          {activeTab === 'topic' && (
            <div>
              <label className="text-sm font-medium text-bloom-text-secondary block mb-1.5">
                What should the lesson be about?
              </label>
              <textarea
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="e.g. Introduction to Quantum Computing, The History of Jazz, How Neural Networks Work..."
                rows={3}
                className="w-full text-sm border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-300 resize-none"
                autoFocus
              />
            </div>
          )}

          {/* URL Tab */}
          {activeTab === 'url' && (
            <div>
              <label className="text-sm font-medium text-bloom-text-secondary block mb-1.5">
                Website URL
              </label>
              <div className="relative">
                <Link size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-bloom-text-muted" />
                <input
                  type="url"
                  value={urlInput}
                  onChange={e => setUrlInput(e.target.value)}
                  placeholder="https://en.wikipedia.org/wiki/..."
                  className="w-full text-sm border rounded-xl pl-10 pr-4 py-3 outline-none focus:ring-2 focus:ring-purple-300"
                  autoFocus
                />
              </div>
              <p className="text-xs text-bloom-text-muted mt-1.5">
                The AI will read the page content and build a lesson around it.
              </p>
            </div>
          )}

          {/* PDF Tab */}
          {activeTab === 'pdf' && (
            <div>
              <label className="text-sm font-medium text-bloom-text-secondary block mb-1.5">
                Upload a PDF
              </label>
              <button
                onClick={() => fileInputRef.current?.click()}
                className={`w-full border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 transition-all ${
                  pdfFile
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-slate-200 hover:border-purple-300 hover:bg-purple-50/30'
                }`}
              >
                {pdfFile ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <FileText size={20} className="text-purple-600" />
                    </div>
                    <span className="text-sm font-medium text-purple-800 text-center break-all">{pdfFile.name}</span>
                    <span className="text-xs text-purple-500">{(pdfFile.size / 1024 / 1024).toFixed(1)} MB · Click to change</span>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                      <Upload size={20} className="text-slate-400" />
                    </div>
                    <span className="text-sm font-medium text-bloom-text-secondary">Click to choose a PDF</span>
                    <span className="text-xs text-bloom-text-muted">Text will be extracted and used to create the lesson</span>
                  </>
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) setPdfFile(file)
                }}
              />
            </div>
          )}

          {/* Module Count Slider (all tabs) */}
          <div>
            <label className="text-sm font-medium text-bloom-text-secondary block mb-1.5">
              Number of modules: <span className="text-purple-600 font-bold">{moduleCount}</span>
            </label>
            <input
              type="range"
              min={2}
              max={6}
              value={moduleCount}
              onChange={e => setModuleCount(parseInt(e.target.value))}
              className="w-full accent-purple-500"
            />
            <div className="flex justify-between text-xs text-bloom-text-muted mt-0.5">
              <span>2 (quick ~3 min)</span>
              <span>6 (detailed ~10 min)</span>
            </div>
          </div>

          {/* How it works note */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-indigo-50 border border-indigo-100">
            <Sparkles size={15} className="text-indigo-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-indigo-700 leading-relaxed">
              Generation happens <strong>in the background</strong> — you can continue editing or leave and come back. A progress bar will appear at the top of the editor.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200">
              <AlertCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            color="orange"
            onClick={handleSubmit}
            disabled={!canSubmit()}
            className="w-full !py-3.5"
            style={{ background: 'linear-gradient(135deg, #9333ea, #4f46e5)' }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Starting generation...</span>
              </>
            ) : (
              <>
                <Sparkles size={18} />
                <span>Generate Lesson</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Generation Status Banner
// ═══════════════════════════════════════════════════════

function GenerationStatusBanner({
  job,
  onDismiss,
}: {
  job: GenerationJob
  onDismiss: () => void
}) {
  const isActive = job.status === 'pending' || job.status === 'planning' || job.status === 'generating'
  const isCompleted = job.status === 'completed'
  const isFailed = job.status === 'failed'

  const progress = job.totalModules > 0
    ? (job.completedModules + (job.status === 'generating' ? 0.3 : 0)) / job.totalModules
    : 0

  const statusLabel = () => {
    if (job.status === 'pending') return 'Starting generation...'
    if (job.status === 'planning') return 'AI is planning the lesson structure...'
    if (job.status === 'generating') {
      if (job.currentModuleTitle) return `Generating: ${job.currentModuleTitle}`
      return `Generating module ${job.completedModules + 1} of ${job.totalModules}...`
    }
    if (job.status === 'completed') return 'Generation complete! Scroll down to see your modules.'
    if (job.status === 'failed') return job.error || 'Generation failed.'
    return ''
  }

  const bgClass = isFailed
    ? 'bg-red-50 border-red-200'
    : isCompleted
    ? 'bg-emerald-50 border-emerald-200'
    : 'bg-purple-50 border-purple-200'

  const textClass = isFailed ? 'text-red-800' : isCompleted ? 'text-emerald-800' : 'text-purple-800'
  const subTextClass = isFailed ? 'text-red-600' : isCompleted ? 'text-emerald-600' : 'text-purple-600'

  return (
    <div className={`rounded-2xl border p-4 ${bgClass}`}>
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 ${isActive ? 'animate-spin' : ''}`}>
          {isFailed ? (
            <AlertCircle size={20} className="text-red-500" />
          ) : isCompleted ? (
            <CheckCircle2 size={20} className="text-emerald-500" />
          ) : (
            <RefreshCw size={20} className="text-purple-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${textClass}`}>
            {isActive ? 'AI is generating your lesson' : isCompleted ? 'Lesson generated!' : 'Generation failed'}
          </p>
          <p className={`text-xs truncate mt-0.5 ${subTextClass}`}>{statusLabel()}</p>
          {isActive && job.totalModules > 0 && (
            <div className="mt-2">
              <ProgressBar progress={progress} color="orange" animated />
              <p className={`text-xs mt-1 ${subTextClass}`}>
                {job.completedModules} of {job.totalModules} modules complete
              </p>
            </div>
          )}
        </div>
        {(isCompleted || isFailed) && (
          <button
            onClick={onDismiss}
            className="p-1.5 hover:bg-black/5 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={16} className={subTextClass} />
          </button>
        )}
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
