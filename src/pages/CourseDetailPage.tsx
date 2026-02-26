import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Brain, ChevronLeft, Check, Lock, BookOpen, Puzzle, Bookmark, BookmarkCheck } from 'lucide-react'
import { api, CourseWithLevels, UserProgress } from '../lib/api'
import Card from '../components/Card'
import Button from '../components/Button'
import LevelBadge from '../components/LevelBadge'
import { AIBadge, CreatorTag } from './WorkshopPage'

export default function CourseDetailPage() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [course, setCourse] = useState<CourseWithLevels | null>(null)
  const [progress, setProgress] = useState<UserProgress[]>([])
  const [showOverview, setShowOverview] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaved, setIsSaved] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  useEffect(() => {
    if (courseId) loadCourse()
  }, [courseId])
  
  async function loadCourse() {
    try {
      const { course } = await api.getCourse(courseId!)
      setCourse(course)
      
      try {
        const { progress } = await api.getCourseProgress(courseId!)
        setProgress(progress)
      } catch {
        // Progress may not exist yet
      }

      try {
        const { saved } = await api.checkCourseInLibrary(courseId!)
        setIsSaved(saved)
      } catch {
        // Library check may fail silently
      }
    } catch (error) {
      console.error('Failed to load course:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleLibrary() {
    if (!courseId || isSaving) return
    setIsSaving(true)
    try {
      if (isSaved) {
        await api.removeCourseFromLibrary(courseId)
        setIsSaved(false)
      } else {
        await api.addCourseToLibrary(courseId)
        setIsSaved(true)
      }
    } catch (error) {
      console.error('Failed to update library:', error)
    } finally {
      setIsSaving(false)
    }
  }
  
  function isCompleted(lessonId: string) {
    return progress.some(p => p.lessonId === lessonId && p.completed)
  }
  
  function isUnlocked(lessonIndex: number, levelIndex: number) {
    if (levelIndex === 0 && lessonIndex === 0) return true
    
    if (!course) return false
    
    if (lessonIndex > 0) {
      const prevLesson = course.levels[levelIndex].lessons[lessonIndex - 1]
      return isCompleted(prevLesson.id)
    }
    
    if (levelIndex > 0) {
      const prevLevel = course.levels[levelIndex - 1]
      const lastLesson = prevLevel.lessons[prevLevel.lessons.length - 1]
      return isCompleted(lastLesson.id)
    }
    
    return false
  }
  
  const themeColor = course?.themeColor || '#FF6B35'
  const nextLesson = course?.levels
    .flatMap(l => l.lessons)
    .find(l => !isCompleted(l.id))
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bloom-orange border-t-transparent" />
      </div>
    )
  }
  
  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-bloom-text-secondary">Course not found</p>
      </div>
    )
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back + Save Buttons */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-bloom-text-secondary hover:text-bloom-text transition-colors"
        >
          <ChevronLeft size={20} />
          <span className="font-medium">Back</span>
        </button>

        <button
          onClick={toggleLibrary}
          disabled={isSaving}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-sm font-medium ${
            isSaved
              ? 'bg-bloom-orange/10 text-bloom-orange hover:bg-bloom-orange/20'
              : 'bg-slate-100 text-bloom-text-secondary hover:bg-slate-200 hover:text-bloom-text'
          }`}
        >
          {isSaved ? (
            <>
              <BookmarkCheck size={15} />
              Saved
            </>
          ) : (
            <>
              <Bookmark size={15} />
              Save
            </>
          )}
        </button>
      </div>
      
      {/* Course Header */}
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
          {course.creatorName && <CreatorTag name={course.creatorName} />}
          {course.aiInvolvement && <AIBadge involvement={course.aiInvolvement} />}
        </div>

        {/* Level Badge */}
        {course.levels[0] && (
          <LevelBadge 
            level={1} 
            title={course.levels[0].title} 
            color={themeColor} 
          />
        )}
      </div>
      
      {/* Lesson Path */}
      <div className="space-y-0">
        {course.levels.map((level, levelIndex) => (
          <div key={level.id}>
            {levelIndex > 0 && (
              <div className="py-4 pl-7">
                <div 
                  className="w-0.5 h-8 mx-auto"
                  style={{ backgroundColor: `${themeColor}30` }}
                />
              </div>
            )}
            
            {level.lessons.map((lesson, lessonIndex) => {
              const completed = isCompleted(lesson.id)
              const unlocked = isUnlocked(lessonIndex, levelIndex)
              const isFirst = levelIndex === 0 && lessonIndex === 0
              const isLast = levelIndex === course.levels.length - 1 && 
                            lessonIndex === level.lessons.length - 1
              
              return (
                <div key={lesson.id} className="flex items-start gap-4">
                  {/* Vertical line and node */}
                  <div className="flex flex-col items-center">
                    {!isFirst && (
                      <div 
                        className="w-0.5 h-5"
                        style={{ 
                          backgroundColor: unlocked ? `${themeColor}30` : '#E5E7EB' 
                        }}
                      />
                    )}
                    
                    <div 
                      className={`w-14 h-14 rounded-full flex items-center justify-center border-3 transition-all duration-200 ${
                        unlocked && !completed 
                          ? 'cursor-pointer hover:scale-105' 
                          : ''
                      }`}
                      style={{ 
                        backgroundColor: completed 
                          ? `${themeColor}20` 
                          : unlocked 
                            ? 'white' 
                            : '#F3F4F6',
                        borderColor: completed || unlocked 
                          ? themeColor 
                          : '#E5E7EB',
                        borderWidth: '3px',
                      }}
                      onClick={() => unlocked && navigate(`/lesson/${lesson.id}`)}
                    >
                      {completed ? (
                        <Check size={24} style={{ color: themeColor }} strokeWidth={3} />
                      ) : !unlocked ? (
                        <Lock size={20} className="text-gray-400" />
                      ) : lesson.type === 'exercise' ? (
                        <Puzzle size={24} style={{ color: themeColor }} />
                      ) : (
                        <BookOpen size={24} style={{ color: themeColor }} />
                      )}
                    </div>
                    
                    {!isLast && (
                      <div 
                        className="w-0.5 h-5"
                        style={{ 
                          backgroundColor: unlocked ? `${themeColor}30` : '#E5E7EB' 
                        }}
                      />
                    )}
                  </div>
                  
                  {/* Lesson info */}
                  <div className="pt-3">
                    <h3 className={`font-semibold ${
                      unlocked ? 'text-bloom-text' : 'text-bloom-text-muted'
                    }`}>
                      {lesson.title}
                    </h3>
                    {lesson.type === 'exercise' && (
                      <span className="text-sm text-bloom-text-secondary">Exercise</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
      
      {/* Start Button */}
      <Card>
        <h3 className="text-lg font-bold text-bloom-text text-center mb-4">
          {course.title}
        </h3>
        <Button 
          onClick={() => nextLesson && navigate(`/lesson/${nextLesson.id}`)}
          disabled={!nextLesson}
          style={{ backgroundColor: themeColor }}
        >
          {progress.length > 0 ? 'Continue' : 'Start'}
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
              <h2 className="text-2xl font-bold text-bloom-text">{course.title}</h2>
              <p className="text-bloom-text-secondary mt-2">{course.description}</p>
            </div>
            
            {course.collaborators && course.collaborators.length > 0 && (
              <div className="text-center mb-6">
                <p className="text-sm text-bloom-text-secondary mb-2">Made in collaboration with</p>
                <div className="flex justify-center gap-4">
                  {course.collaborators.map(c => (
                    <span key={c} className="font-medium text-bloom-text">{c}</span>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-xl font-bold text-bloom-text">{course.lessonCount}</div>
                <div className="text-sm text-bloom-text-secondary">Lessons</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-bloom-text">{course.exerciseCount}</div>
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
