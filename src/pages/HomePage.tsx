import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, ChevronRight, Sparkles } from 'lucide-react'
import { api, Course, CourseWithLevels } from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import { AIBadge, CreatorTag } from './WorkshopPage'

export default function HomePage() {
  const navigate = useNavigate()
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<CourseWithLevels | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [swipeOffset, setSwipeOffset] = useState(0) // px offset during swipe
  
  useEffect(() => {
    loadData()
  }, [])
  
  async function loadData() {
    try {
      const { courses } = await api.getRecommendedCourses()
      setCourses(courses)
      
      if (courses.length > 0) {
        const { course } = await api.getCourse(courses[0].id)
        setSelectedCourse(course)
      }
    } catch (error) {
      console.error('Failed to load courses:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  // Use refs so touch handlers always see latest values
  const currentIndexRef = useRef(currentIndex)
  currentIndexRef.current = currentIndex
  const coursesRef = useRef(courses)
  coursesRef.current = courses

  const selectCourse = useCallback(async (index: number) => {
    if (index === currentIndexRef.current || !coursesRef.current[index]) return
    setCurrentIndex(index)
    
    try {
      const { course } = await api.getCourse(coursesRef.current[index].id)
      setSelectedCourse(course)
    } catch (error) {
      console.error('Failed to load course:', error)
    }
  }, [])
  
  // Swipe handling for recommended course card
  const cardRef = useRef<HTMLDivElement>(null)
  const selectCourseRef = useRef(selectCourse)
  selectCourseRef.current = selectCourse

  useEffect(() => {
    const el = cardRef.current
    if (!el) return

    let startX: number | null = null
    let startY: number | null = null
    let swiping = false
    let didSwipe = false

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      swiping = false
      didSwipe = false
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startX === null || startY === null) return
      const dx = e.touches[0].clientX - startX
      const dy = Math.abs(e.touches[0].clientY - startY)
      if (!swiping && Math.abs(dx) > 15 && Math.abs(dx) > dy * 1.3) {
        swiping = true
      }
      if (swiping) {
        e.preventDefault()
        // Clamp the offset so it feels bounded
        const maxDrag = 120
        const clamped = Math.sign(dx) * Math.min(Math.abs(dx), maxDrag)
        setSwipeOffset(clamped)
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!swiping || startX === null) {
        startX = null
        startY = null
        setSwipeOffset(0)
        return
      }
      const endX = e.changedTouches[0]?.clientX ?? startX
      const dx = endX - startX
      const threshold = 50
      const idx = currentIndexRef.current
      const len = coursesRef.current.length

      if (dx < -threshold && idx < len - 1) {
        selectCourseRef.current(idx + 1)
        didSwipe = true
      } else if (dx > threshold && idx > 0) {
        selectCourseRef.current(idx - 1)
        didSwipe = true
      }

      startX = null
      startY = null
      swiping = false
      setSwipeOffset(0)

      // Prevent the tap/click from firing after a swipe
      if (didSwipe) {
        const suppress = (ev: Event) => { ev.stopPropagation(); ev.preventDefault() }
        el.addEventListener('click', suppress, { capture: true, once: true })
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd, { passive: true })

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
    }
  }, [])

  const course = courses[currentIndex]
  const themeColor = course?.themeColor || '#FF6B35'
  const firstLessonId = selectedCourse?.levels[0]?.lessons[0]?.id
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bloom-orange border-t-transparent" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Recommended Course Card */}
      {course && (
        <div
          ref={cardRef}
          className="overflow-hidden"
          style={{ touchAction: 'pan-y' }}
        >
        <Card 
          className="text-center py-8 cursor-pointer hover:shadow-bloom-lg transition-shadow"
          onClick={() => navigate(`/courses/${course.id}`)}
          style={{
            transform: swipeOffset ? `translateX(${swipeOffset}px)` : undefined,
            opacity: swipeOffset ? 1 - Math.abs(swipeOffset) / 300 : 1,
            transition: swipeOffset ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
          }}
        >
          {/* Recommended Badge */}
          <span 
            className="inline-block px-4 py-1.5 rounded-full text-xs font-semibold mb-4"
            style={{ backgroundColor: `${themeColor}20`, color: themeColor }}
          >
            RECOMMENDED
          </span>
          
          {/* Title */}
          <h2 className="text-2xl font-bold text-bloom-text mb-2">{course.title}</h2>
          
          {/* Level */}
          <span className="text-sm font-bold" style={{ color: themeColor }}>
            LEVEL 1
          </span>

          {/* Creator + AI tags */}
          <div className="flex items-center justify-center gap-2 mt-2">
            {course.creatorName && <CreatorTag name={course.creatorName} />}
            {course.aiInvolvement && <AIBadge involvement={course.aiInvolvement} />}
          </div>
          
          {/* Illustration */}
          <div className="my-8 flex justify-center">
            <div 
              className="relative w-48 h-48 rounded-full flex items-center justify-center animate-pulse-soft"
              style={{ backgroundColor: `${themeColor}15` }}
            >
              <div 
                className="absolute inset-4 rounded-full"
                style={{ backgroundColor: `${themeColor}10` }}
              />
              <Brain size={80} style={{ color: themeColor }} />
              
              {/* Floating elements */}
              <Sparkles 
                size={24} 
                className="absolute top-4 right-8 animate-bounce" 
                style={{ color: themeColor, animationDelay: '0.5s' }} 
              />
            </div>
          </div>
          
          {/* Pagination dots */}
          {courses.length > 1 && (
            <div className="flex justify-center gap-2">
              {courses.slice(0, 5).map((_, index) => (
                <button
                  key={index}
                  onClick={(e) => { e.stopPropagation(); selectCourse(index); }}
                  className={`w-2 h-2 rounded-full transition-all duration-200 ${
                    index === currentIndex ? 'w-6' : ''
                  }`}
                  style={{ 
                    backgroundColor: index === currentIndex ? themeColor : '#D1D5DB'
                  }}
                />
              ))}
            </div>
          )}
        </Card>
        </div>
      )}
      
      {/* Lessons Section */}
      {selectedCourse && (
        <Card>
          <div className="space-y-4">
            {selectedCourse.levels[0]?.lessons.slice(0, 2).map((lesson, index) => (
              <div 
                key={lesson.id}
                className="flex items-center gap-4 py-2"
              >
                <div 
                  className={`w-14 h-14 rounded-full flex items-center justify-center ${
                    index === 0 ? '' : 'opacity-50'
                  }`}
                  style={{ 
                    backgroundColor: index === 0 ? `${themeColor}15` : '#F3F4F6'
                  }}
                >
                  <Brain 
                    size={28} 
                    style={{ color: index === 0 ? themeColor : '#9CA3AF' }} 
                  />
                </div>
                
                <div className="flex-1">
                  <h3 className={`font-semibold ${index === 0 ? 'text-bloom-text' : 'text-bloom-text-secondary'}`}>
                    {lesson.title}
                  </h3>
                  {lesson.type === 'exercise' && (
                    <span className="text-sm text-bloom-text-muted">Exercise</span>
                  )}
                </div>
                
                <div 
                  className={`w-6 h-6 rounded-full border-2 ${
                    index === 0 ? '' : 'opacity-30'
                  }`}
                  style={{ borderColor: index === 0 ? themeColor : '#D1D5DB' }}
                />
              </div>
            ))}
            
            {selectedCourse.levels[0]?.lessons.length > 2 && (
              <button 
                className="flex items-center gap-2 text-bloom-text-secondary hover:text-bloom-text transition-colors"
                onClick={() => navigate(`/courses/${course.id}`)}
              >
                <span className="text-sm font-medium">View all lessons</span>
                <ChevronRight size={16} />
              </button>
            )}
            
            <Button 
              color="orange"
              onClick={() => firstLessonId && navigate(`/lesson/${firstLessonId}`)}
              disabled={!firstLessonId}
              style={{ backgroundColor: themeColor }}
            >
              Start
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
