import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { X, Zap, Check, Lightbulb, ChevronRight, ChevronDown, ChevronUp, ChevronLeft, Sparkles, Info, BookOpen } from 'lucide-react'
import { api, LessonWithContent, LessonContent, LessonModule, ContentData } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import ProgressBar from '../components/ProgressBar'
import RichContentRenderer, { RichText } from '../components/RichContentRenderer'
import MetadataPanel from '../components/workshop/MetadataPanel'

const PULL_THRESHOLD = 120

export default function LessonPage() {
  const { lessonId } = useParams()
  const navigate = useNavigate()
  const { stats, refreshStats } = useAuth()

  const [lesson, setLesson] = useState<LessonWithContent | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)
  const [showModuleComplete, setShowModuleComplete] = useState(false)
  const [completedModuleIndex, setCompletedModuleIndex] = useState(-1)

  // Pull-to-advance/go-back state
  const [pullDistance, setPullDistance] = useState(0)           // always >= 0
  const [scrollDir, setScrollDir] = useState<'forward' | 'backward' | 'metadata'>('forward')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [pageAnim, setPageAnim] = useState<'idle' | 'exit' | 'enter'>('enter')
  const [confirmed, setConfirmed] = useState(false)
  const [animDir, setAnimDir] = useState<'forward' | 'backward' | 'metadata'>('forward') // direction of current animation

  // Metadata panel state (swipe-right to reveal)
  const [metadataOpen, setMetadataOpen] = useState(false)
  const [searchParams] = useSearchParams()

  // Refs for gesture handling (avoid stale closures)
  const containerRef = useRef<HTMLDivElement>(null)
  const footerRef = useRef<HTMLElement>(null)
  const isTransitioningRef = useRef(false)
  const canAdvanceRef = useRef(false)
  const canGoBackRef = useRef(false)
  const doAdvanceRef = useRef<() => void>(() => {})
  const doGoBackRef = useRef<() => void>(() => {})
  const pullDistanceRef = useRef(0)
  const scrollDirRef = useRef<'forward' | 'backward' | 'metadata'>('forward')
  const wheelAccumRef = useRef(0)
  const wheelDirRef = useRef<'forward' | 'backward' | 'metadata'>('forward')
  const wheelTimeoutRef = useRef<ReturnType<typeof setTimeout>>()
  const metadataOpenRef = useRef(false)
  const doOpenMetadataRef = useRef<() => void>(() => {})

  // ── Load lesson ──
  useEffect(() => {
    if (!lessonId) return
    setIsLoading(true)

    api.getLesson(lessonId)
      .then(({ lesson }) => {
        setLesson(lesson)
        // Handle ?start=N query param
        const startParam = searchParams.get('start')
        if (startParam) {
          const startIdx = parseInt(startParam)
          const totalPages = (lesson.modules || []).reduce((sum, m) => sum + (m.content || []).length, 0) || lesson.content.length
          if (!isNaN(startIdx) && startIdx > 0 && startIdx < totalPages) {
            setCurrentIndex(startIdx)
          }
        }
      })
      .catch(err => console.error('Failed to load lesson:', err))
      .finally(() => setIsLoading(false))
  }, [lessonId])

  // Lock body scroll while lesson is open & initial enter animation
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

  // ── Flatten modules into a single page list with module boundary tracking ──
  const { flatPages, moduleBoundaries, modules } = useMemo(() => {
    if (!lesson) return { flatPages: [] as LessonContent[], moduleBoundaries: [] as number[], modules: [] as LessonModule[] }

    const mods = lesson.modules || []
    if (mods.length === 0) {
      // No modules — fall back to flat content
      return { flatPages: lesson.content || [], moduleBoundaries: [] as number[], modules: [] as LessonModule[] }
    }

    const flat: LessonContent[] = []
    const boundaries: number[] = [] // indices where each module ends (last page index of each module)

    for (const mod of mods) {
      const modContent = mod.content || []
      for (const page of modContent) {
        flat.push(page)
      }
      if (modContent.length > 0) {
        boundaries.push(flat.length - 1) // last page index of this module
      }
    }

    return { flatPages: flat, moduleBoundaries: boundaries, modules: mods }
  }, [lesson])

  // ── Derived state ──
  const currentContent = flatPages[currentIndex]
  const progress = flatPages.length > 0 ? (currentIndex + 1) / flatPages.length : 0
  const isLast = flatPages.length > 0 ? currentIndex >= flatPages.length - 1 : false
  const isFirst = currentIndex === 0
  const isQuestion = currentContent?.contentData.type === 'question'
  const canContinue = !isQuestion || isCorrect === true
  const pullProgress = Math.min(pullDistance / PULL_THRESHOLD, 1)

  // Module tracking
  const currentModuleIndex = useMemo(() => {
    if (modules.length === 0) return -1
    let pageCount = 0
    for (let i = 0; i < modules.length; i++) {
      pageCount += (modules[i].content || []).length
      if (currentIndex < pageCount) return i
    }
    return modules.length - 1
  }, [modules, currentIndex])

  const currentModule = currentModuleIndex >= 0 ? modules[currentModuleIndex] : null
  const isModuleBoundary = moduleBoundaries.includes(currentIndex) && !isLast

  // Keep refs in sync for event handlers
  canAdvanceRef.current = canContinue && !isTransitioningRef.current
  canGoBackRef.current = !isFirst && !isTransitioningRef.current
  pullDistanceRef.current = pullDistance
  scrollDirRef.current = scrollDir
  metadataOpenRef.current = metadataOpen

  // ── Advance to next page ──
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
      setShowCelebration(true)
      try {
        await api.updateProgress(lessonId!, true, 100)
        await refreshStats()
      } catch (err) {
        console.error('Failed to save progress:', err)
      }
      setTimeout(() => navigate(-1), 1800)
      return
    }

    // Check if we're at a module boundary — show module-complete screen
    if (isModuleBoundary && !showModuleComplete) {
      setCompletedModuleIndex(currentModuleIndex)
      setShowModuleComplete(true)
      setPullDistance(0)
      setConfirmed(false)
      setPageAnim('idle')
      setScrollDir('forward')
      isTransitioningRef.current = false
      setIsTransitioning(false)
      return
    }

    setShowModuleComplete(false)
    setCurrentIndex(prev => prev + 1)
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
  }, [isLast, lessonId, navigate, refreshStats, currentIndex, flatPages, isModuleBoundary, showModuleComplete, currentModuleIndex])

  // ── Go back to previous page ──
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

    setCurrentIndex(prev => prev - 1)
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
  }, [isFirst])

  // ── Open metadata panel (same pull pattern as advance/goBack) ──
  const doOpenMetadata = useCallback(async () => {
    if (isTransitioningRef.current || metadataOpenRef.current) return
    isTransitioningRef.current = true
    setIsTransitioning(true)
    wheelAccumRef.current = 0

    setAnimDir('metadata')
    setConfirmed(true)

    // Let the button confirm animation play
    await new Promise(r => setTimeout(r, 350))
    setPullDistance(0)
    setConfirmed(false)
    setMetadataOpen(true)

    setScrollDir('forward')
    isTransitioningRef.current = false
    setIsTransitioning(false)
  }, [])

  doAdvanceRef.current = doAdvance
  doGoBackRef.current = doGoBack
  doOpenMetadataRef.current = doOpenMetadata

  // ── Answer selection ──
  function handleAnswerSelect(index: number) {
    if (selectedAnswer !== null) return
    setSelectedAnswer(index)
    const data = currentContent?.contentData as ContentData
    if (data.type === 'question') {
      const correct = index === data.correctIndex
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

  // Auto-scroll to explanation when it appears
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

  // ── Unified Touch & Wheel gesture handlers ──
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    // Single set of touch tracking state — decides axis ONCE per gesture
    let touchStartX: number | null = null
    let touchStartY: number | null = null
    let touchAxis: 'horizontal' | 'vertical' | null = null // locked after first significant move
    let touchDir: 'forward' | 'backward' | 'metadata' | null = null

    const isAtBottom = () =>
      el.scrollHeight - el.scrollTop - el.clientHeight < 5

    const isAtTop = () =>
      el.scrollTop < 5

    let touchInsideInteractive = false

    const onTouchStart = (e: TouchEvent) => {
      if (isTransitioningRef.current) return
      // If the touch started inside an interactive component, don't hijack the gesture
      const target = e.target as HTMLElement
      touchInsideInteractive = !!target.closest?.('[data-interactive]')
      touchStartX = e.touches[0].clientX
      touchStartY = e.touches[0].clientY
      touchAxis = null
      touchDir = null
    }

    const onTouchMove = (e: TouchEvent) => {
      if (touchInsideInteractive) return // let interactive components handle their own touches
      if (touchStartX === null || touchStartY === null || isTransitioningRef.current) return

      const dx = e.touches[0].clientX - touchStartX  // positive = swipe right
      const dy = touchStartY - e.touches[0].clientY   // positive = scroll down (finger moves up)
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      // ── Lock axis on first significant movement ──
      if (touchAxis === null) {
        if (absDx < 12 && absDy < 12) return // not enough movement yet

        if (absDx > absDy * 1.2) {
          // Horizontal dominates
          touchAxis = 'horizontal'
          if (dx > 0 && !metadataOpenRef.current) {
            touchDir = 'metadata'
          } else if (dx < 0 && canAdvanceRef.current) {
            touchDir = 'forward'
          } else {
            touchDir = null
          }
        } else if (absDy > absDx * 1.2) {
          // Vertical dominates
          touchAxis = 'vertical'
          if (dy > 0 && isAtBottom() && canAdvanceRef.current) {
            touchDir = 'forward'
          } else if (dy < 0 && isAtTop() && canGoBackRef.current) {
            touchDir = 'backward'
          } else {
            touchDir = null // normal scroll, don't interfere
          }
        } else {
          return // ambiguous, wait for more movement
        }

        if (touchDir === null) return
      }

      if (touchDir === null) return

      // ── HORIZONTAL axis ──
      if (touchAxis === 'horizontal') {
        e.preventDefault()
        const dist = Math.max(0, absDx - 12)
        setPullDistance(dist)
        setScrollDir(touchDir)
        if (dist >= PULL_THRESHOLD) {
          touchStartX = null
          touchStartY = null
          touchAxis = null
          if (touchDir === 'metadata') {
            doOpenMetadataRef.current()
          } else {
            doAdvanceRef.current()
          }
          touchDir = null
        }
        return
      }

      // ── VERTICAL axis ──
      if (touchAxis === 'vertical') {
        if (touchDir === 'forward') {
          if (!canAdvanceRef.current || !isAtBottom()) {
            if (pullDistanceRef.current > 0) { setPullDistance(0); setScrollDir('forward') }
            return
          }
          e.preventDefault()
          const dist = Math.max(0, dy - 12)
          setPullDistance(dist)
          setScrollDir('forward')
          if (dist >= PULL_THRESHOLD) {
            touchStartX = null
            touchStartY = null
            touchAxis = null
            touchDir = null
            doAdvanceRef.current()
          }
        } else if (touchDir === 'backward') {
          if (!canGoBackRef.current || !isAtTop()) {
            if (pullDistanceRef.current > 0) { setPullDistance(0); setScrollDir('forward') }
            return
          }
          e.preventDefault()
          const dist = Math.max(0, -dy - 12)
          setPullDistance(dist)
          setScrollDir('backward')
          if (dist >= PULL_THRESHOLD) {
            touchStartX = null
            touchStartY = null
            touchAxis = null
            touchDir = null
            doGoBackRef.current()
          }
        }
      }
    }

    const onTouchEnd = () => {
      if (pullDistanceRef.current > 0 && pullDistanceRef.current < PULL_THRESHOLD) {
        setPullDistance(0)
      }
      touchStartX = null
      touchStartY = null
      touchAxis = null
      touchDir = null
      touchInsideInteractive = false
    }

    const onWheel = (e: WheelEvent) => {
      if (isTransitioningRef.current) return

      const scrollingDown = e.deltaY > 0
      const scrollingUp = e.deltaY < 0

      // ── FORWARD pull (scroll down at bottom) ──
      if (scrollingDown && isAtBottom() && canAdvanceRef.current) {
        // If we were accumulating backward, reset
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

      // ── BACKWARD pull (scroll up at top) ──
      if (scrollingUp && isAtTop() && canGoBackRef.current) {
        // If we were accumulating forward, reset
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

      // ── Decay if scrolling opposite to current accumulation ──
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

      // ── Horizontal scroll (trackpad swipe left/right) ──
      const scrollingLeft = e.deltaX < 0  // swipe right gesture → metadata
      const scrollingRight = e.deltaX > 0 // swipe left gesture → forward

      if (scrollingRight && canAdvanceRef.current && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (wheelDirRef.current !== 'forward') {
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

      // Swipe right (trackpad) → metadata panel via same pull system
      if (scrollingLeft && !metadataOpenRef.current && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        if (wheelDirRef.current !== 'metadata') {
          wheelAccumRef.current = 0
          setPullDistance(0)
        }
        wheelDirRef.current = 'metadata'
        setScrollDir('metadata')

        e.preventDefault()
        wheelAccumRef.current += Math.abs(e.deltaX) * 1.2
        wheelAccumRef.current = Math.max(0, wheelAccumRef.current)
        setPullDistance(wheelAccumRef.current)

        if (wheelAccumRef.current >= PULL_THRESHOLD) {
          wheelAccumRef.current = 0
          doOpenMetadataRef.current()
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
  }, [isLoading, showCelebration])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        navigate(-1)
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
  }, [navigate])

  // ═══════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-bloom-orange border-t-transparent" />
        </div>
      </div>
    )
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-bloom-text-secondary text-lg">Lesson not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-6 py-2.5 bg-bloom-orange text-white rounded-xl font-semibold hover:opacity-90 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  if (showCelebration) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-bloom-green/90 to-emerald-600 flex items-center justify-center">
        <div className="text-center animate-bounce-in">
          <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles size={48} className="text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Lesson Complete!</h1>
          <p className="text-white/80 text-lg">Great job learning something new</p>
        </div>
      </div>
    )
  }

  if (showModuleComplete && completedModuleIndex >= 0 && modules.length > 0) {
    const completedModule = modules[completedModuleIndex]
    const nextModule = modules[completedModuleIndex + 1]
    const moduleProgress = (completedModuleIndex + 1) / modules.length

    return (
      <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 overflow-hidden" style={{ height: '100dvh' }}>
        <header className="flex-shrink-0 z-40 bg-white/10 backdrop-blur-xl border-b border-white/10 px-4 py-3">
          <div className="max-w-2xl mx-auto flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 hover:bg-white/10 rounded-xl transition-all duration-200"
            >
              <X size={24} className="text-white" />
            </button>
            <div className="flex-1">
              <ProgressBar progress={moduleProgress} color="green" animated />
            </div>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-6">
          <div className="text-center animate-bounce-in max-w-md">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-6">
              <BookOpen size={40} className="text-white" />
            </div>
            <p className="text-white/60 text-sm font-medium uppercase tracking-wider mb-2">
              Module {completedModuleIndex + 1} of {modules.length} complete
            </p>
            <h1 className="text-3xl font-bold text-white mb-3">{completedModule?.title || 'Module Complete!'}</h1>
            {completedModule?.description && (
              <p className="text-white/70 text-base mb-8">{completedModule.description}</p>
            )}

            {nextModule && (
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/10 mb-8">
                <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-1">Up next</p>
                <h2 className="text-xl font-semibold text-white mb-1">{nextModule.title}</h2>
                {nextModule.description && (
                  <p className="text-white/60 text-sm">{nextModule.description}</p>
                )}
              </div>
            )}

            <button
              onClick={() => {
                setShowModuleComplete(false)
                setCurrentIndex(prev => prev + 1)
                setSelectedAnswer(null)
                setIsCorrect(null)
                setShowExplanation(false)
                setPageAnim('enter')
                setAnimDir('forward')
                setTimeout(() => setPageAnim('idle'), 380)
              }}
              className="px-8 py-3 bg-white text-indigo-600 rounded-xl font-semibold text-lg hover:bg-white/90 transition-all shadow-lg shadow-black/10 active:scale-95"
            >
              {nextModule ? 'Continue to Next Module' : 'Continue'}
              <ChevronRight size={20} className="inline-block ml-1" />
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Compute content transform + opacity based on state
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
    // Idle — driven by pull gesture
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

  // Enter animation: forward enters from below, backward enters from above
  const enterClass = pageAnim === 'enter'
    ? (animDir === 'forward' ? 'lesson-page-enter' : 'lesson-page-enter-reverse')
    : ''

  return (
    <div className="fixed inset-0 flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50 overflow-hidden" style={{ height: '100dvh', overscrollBehavior: 'none' }}>
      {/* ── Header ── */}
      <header className="flex-shrink-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105"
          >
            <X size={24} className="text-bloom-text" />
          </button>
          <div className="flex-1">
            <ProgressBar progress={progress} color="green" animated />
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200/50">
            <span className="font-bold text-amber-700">{stats?.energy ?? 5}</span>
            <Zap size={16} className="text-amber-500" fill="currentColor" />
          </div>
        </div>
      </header>

      {/* ── Content area ── */}
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
            {currentContent && (
              <FullPageContent
                content={currentContent}
                selectedAnswer={selectedAnswer}
                isCorrect={isCorrect}
                showExplanation={showExplanation}
                onAnswerSelect={handleAnswerSelect}
              />
            )}
          </div>
          <div className="flex-1 min-h-[24px]" />
        </div>

      </main>

      {/* Pull-progress gradient overlay — fixed to viewport, above footer */}
      {pullProgress > 0 && (
        <div
          className="fixed pointer-events-none z-30"
          style={{
            ...(scrollDir === 'forward'
              ? { left: 0, right: 0, bottom: footerRef.current ? `${footerRef.current.offsetHeight}px` : '72px', height: '160px', background: `linear-gradient(to top, rgba(74, 175, 80, ${pullProgress * 0.12}), transparent)` }
              : scrollDir === 'metadata'
              ? { top: 0, bottom: 0, right: 0, width: '160px', background: `linear-gradient(to left, rgba(99, 102, 241, ${pullProgress * 0.15}), transparent)` }
              : { left: 0, right: 0, top: 0, height: '160px', background: `linear-gradient(to bottom, rgba(74, 144, 217, ${pullProgress * 0.12}), transparent)` }
            ),
          }}
        />
      )}

      {/* ── Metadata info button ── */}
      <button
        onClick={() => setMetadataOpen(true)}
        className="fixed top-4 right-4 z-30 p-2 bg-white/90 backdrop-blur-md rounded-xl shadow-sm border border-slate-200/50 hover:bg-slate-50 transition-colors"
        title="View page info"
      >
        <Info size={18} className="text-bloom-text-secondary" />
      </button>

      {/* ── Metadata Panel (swipe right to reveal) ── */}
      <MetadataPanel
        lessonId={lessonId}
        currentPageIndex={currentIndex}
        isOpen={metadataOpen}
        onClose={() => setMetadataOpen(false)}
        slideProgress={0}
        isOfficial={lesson?.isOfficial}
      />

      {/* ── Footer ── */}
      <footer ref={footerRef} className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-t border-slate-200/50 px-4 pt-4 pb-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between w-full">
            <div className="flex flex-col">
              {currentModule && modules.length > 1 && (
                <span className="text-xs text-bloom-text-secondary/60 font-medium">
                  {currentModule.title}
                </span>
              )}
              <span className="text-sm text-bloom-text-secondary font-medium tabular-nums">
                {currentIndex + 1} / {flatPages.length}
              </span>
            </div>

            <MorphButton
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
//  MorphButton — contracts on pull, direction-aware
// ═══════════════════════════════════════════════════════

function MorphButton({
  pullProgress,
  scrollDir,
  canContinue,
  canGoBack,
  isTransitioning,
  confirmed,
  confirmedDir,
  isCorrect,
  isLast,
  onClickForward,
}: {
  pullProgress: number
  scrollDir: 'forward' | 'backward' | 'metadata'
  canContinue: boolean
  canGoBack: boolean
  isTransitioning: boolean
  confirmed: boolean
  confirmedDir: 'forward' | 'backward' | 'metadata'
  isCorrect: boolean | null
  isLast: boolean
  onClickForward: () => void
}) {
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t

  const isActive = scrollDir === 'forward'
    ? (canContinue && pullProgress > 0)
    : scrollDir === 'backward'
    ? (canGoBack && pullProgress > 0)
    : pullProgress > 0 // metadata — always active

  const activePull = isActive ? pullProgress : 0
  const t = confirmed ? 1 : activePull
  const dir = confirmed ? confirmedDir : scrollDir

  const width = lerp(160, 52, t)
  const borderRadius = lerp(16, 26, t)
  const textOpacity = confirmed ? 0 : Math.max(0, 1 - activePull * 2.5)
  const iconOpacity = confirmed ? 1 : (activePull > 0.35 ? Math.min(1, (activePull - 0.35) * 2.5) : 0)
  const pastThreshold = activePull >= 1 || confirmed

  const isForward = dir === 'forward'
  const isMetadata = dir === 'metadata'
  const baseBg = isCorrect ? '#4CAF50' : '#1A1A2E'
  const confirmedBg = isForward ? '#4CAF50' : isMetadata ? '#6366F1' : '#4A90D9' // green / indigo / blue
  const activeBg = pastThreshold ? confirmedBg : baseBg

  const disabled = (!canContinue || isTransitioning) && !confirmed

  // For metadata: pin the LEFT edge by shifting the button left as width shrinks.
  // The button is right-aligned, so normally the right edge stays fixed.
  // translateX = -(160 - width) shifts it left so the left edge stays put instead.
  const metadataOffsetX = isMetadata ? -(160 - width) : 0

  return (
    <button
      onClick={onClickForward}
      disabled={disabled}
      className={`relative overflow-hidden text-white font-semibold flex-shrink-0
        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
        ${!confirmed && !isTransitioning ? 'active:scale-95' : ''}
        ${pastThreshold && isForward ? 'shadow-lg shadow-emerald-400/50' : ''}
        ${pastThreshold && isMetadata ? 'shadow-lg shadow-indigo-400/50' : ''}
        ${pastThreshold && !isForward && !isMetadata ? 'shadow-lg shadow-blue-400/50' : ''}
        ${!pastThreshold ? 'shadow-sm' : ''}`}
      style={{
        width: `${width}px`,
        height: '48px',
        borderRadius: `${borderRadius}px`,
        backgroundColor: activeBg,
        transform: metadataOffsetX !== 0 ? `translateX(${metadataOffsetX}px)` : undefined,
        transition: confirmed
          ? 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)'
          : activePull > 0
            ? 'background-color 0.15s, box-shadow 0.15s'
            : 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
      }}
    >
      {/* Label — fades out during pull or on confirm */}
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
        {isMetadata ? (
          pastThreshold ? <Info size={22} strokeWidth={3} /> : <ChevronLeft size={22} />
        ) : pastThreshold ? (
          isForward ? <Check size={22} strokeWidth={3} /> : <ChevronLeft size={22} strokeWidth={3} />
        ) : (
          isForward ? <ChevronDown size={22} /> : <ChevronUp size={22} />
        )}
      </span>
    </button>
  )
}

// ═══════════════════════════════════════════════════════
//  FullPageContent — immersive, centered content blocks
// ═══════════════════════════════════════════════════════

interface FullPageContentProps {
  content: LessonContent
  selectedAnswer: number | null
  isCorrect: boolean | null
  showExplanation: boolean
  onAnswerSelect: (index: number) => void
}

function FullPageContent({
  content,
  selectedAnswer,
  isCorrect,
  showExplanation,
  onAnswerSelect,
}: FullPageContentProps) {
  const data = content.contentData

  // ── NEW: Rich page with multiple blocks ──
  if (data.type === 'page') {
    return <RichContentRenderer blocks={data.blocks} />
  }

  // ── Question (enhanced with optional rich text) ──
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

  // ── LEGACY: Text ──
  if (data.type === 'text') {
    const isBold = data.formatting?.bold
    const startsWithEmoji = /^[\p{Emoji}]/u.test(data.text)

    if (isBold) {
      return (
        <div className="text-center py-6 animate-slide-up">
          <h2
            className={`font-bold text-bloom-text leading-tight ${
              startsWithEmoji ? 'text-3xl md:text-4xl' : 'text-2xl md:text-3xl'
            }`}
          >
            {data.text}
          </h2>
          <div className="h-1 w-20 bg-gradient-to-r from-bloom-orange to-bloom-yellow rounded-full mx-auto mt-6" />
        </div>
      )
    }

    // Bullet list
    if (data.text.includes('\n•')) {
      const parts = data.text.split('\n')
      return (
        <div className="space-y-5 py-4 animate-slide-up">
          {parts.map((line, i) => {
            if (line.startsWith('•')) {
              return (
                <div key={i} className="flex gap-4 items-start">
                  <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-br from-bloom-orange to-bloom-yellow mt-3 flex-shrink-0" />
                  <p className="text-xl leading-relaxed text-bloom-text">{line.substring(2)}</p>
                </div>
              )
            }
            if (line.trim()) {
              return (
                <p key={i} className="text-xl leading-relaxed text-bloom-text">{line}</p>
              )
            }
            return null
          })}
        </div>
      )
    }

    // Regular paragraph
    return (
      <div className="py-4 animate-slide-up">
        <p className="text-xl md:text-2xl leading-relaxed text-bloom-text text-center">
          {data.text}
        </p>
      </div>
    )
  }

  // ── LEGACY: Image ──
  if (data.type === 'image') {
    const gradients = [
      'from-blue-400 to-indigo-500',
      'from-emerald-400 to-teal-500',
      'from-orange-400 to-rose-500',
      'from-violet-400 to-purple-500',
      'from-cyan-400 to-blue-500',
    ]
    const idx = data.url.length % gradients.length

    return (
      <div className="flex flex-col items-center py-4 animate-slide-up">
        <div
          className={`bg-gradient-to-br ${gradients[idx]} rounded-3xl p-10 md:p-14 w-full max-w-sm aspect-square flex items-center justify-center relative overflow-hidden shadow-xl`}
        >
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-6 right-10 w-24 h-24 rounded-full bg-white/30" />
            <div className="absolute bottom-8 left-8 w-36 h-36 rounded-full bg-white/20" />
          </div>
          <div className="text-center relative z-10">
            <div className="w-20 h-20 rounded-2xl bg-white/30 flex items-center justify-center mx-auto mb-4 backdrop-blur-sm">
              <span className="text-4xl">
                {data.url.includes('wave') ? '〰️' :
                 data.url.includes('keyboard') ? '🎹' :
                 data.url.includes('chord') ? '🎵' :
                 data.url.includes('bit') ? '💻' :
                 data.url.includes('qubit') ? '⚛️' :
                 data.url.includes('entangle') ? '🔗' :
                 data.url.includes('sphere') ? '🌐' : '📊'}
              </span>
            </div>
            <span className="text-white/90 text-base font-medium">Illustration</span>
          </div>
        </div>
        {data.caption && (
          <p className="text-base text-bloom-text-secondary italic text-center mt-5 px-4 max-w-md">
            {data.caption}
          </p>
        )}
      </div>
    )
  }

  // Fallback for unknown content types
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyData = data as any
  return (
    <div className="flex items-center justify-center py-4 animate-slide-up">
      <div className="p-8 rounded-3xl bg-gradient-to-br from-purple-500 to-indigo-600 w-full max-w-sm shadow-xl">
        <div className="text-center text-white">
          <Sparkles size={40} className="mx-auto mb-4" />
          <p className="font-semibold text-xl">Interactive Component</p>
          {anyData.componentId && (
            <p className="text-white/70 mt-2">{anyData.componentId}</p>
          )}
        </div>
      </div>
    </div>
  )
}
