import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Brain, Palette, Calculator, Atom, Code, ChevronRight, Music, Zap } from 'lucide-react'
import { api, Category, Course } from '../lib/api'
import Card from '../components/Card'

const categoryIcons: Record<string, React.ElementType> = {
  logic: Brain,
  writing: Palette,
  math: Calculator,
  science: Atom,
  cs: Code,
  music: Music,
  physics: Zap,
}

const categoryColors: Record<string, string> = {
  logic: '#FF6B35',
  writing: '#FFB800',
  math: '#4A90D9',
  science: '#4CAF50',
  cs: '#9B59B6',
  music: '#E91E63',
  physics: '#00BCD4',
}

export default function CoursesPage() {
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    loadData()
  }, [])
  
  async function loadData() {
    try {
      const [categoriesRes, coursesRes] = await Promise.all([
        api.getCategories(),
        api.getCourses(),
      ])
      
      setCategories(categoriesRes.categories)
      setCourses(coursesRes.courses)
      
      if (categoriesRes.categories.length > 0) {
        setSelectedCategory(categoriesRes.categories[0])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const filteredCourses = selectedCategory 
    ? courses.filter(c => c.categoryId === selectedCategory.id)
    : courses
  
  const categoryColor = selectedCategory ? categoryColors[selectedCategory.slug] || '#4A90D9' : '#4A90D9'
  const CategoryIcon = selectedCategory ? categoryIcons[selectedCategory.slug] || Brain : Brain
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bloom-blue border-t-transparent" />
      </div>
    )
  }
  
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category)}
            className={`px-4 py-2 whitespace-nowrap transition-all duration-200 border-b-2 ${
              selectedCategory?.id === category.id 
                ? 'text-bloom-text font-semibold' 
                : 'text-bloom-text-secondary border-transparent hover:text-bloom-text'
            }`}
            style={{ 
              borderColor: selectedCategory?.id === category.id 
                ? categoryColors[category.slug] 
                : 'transparent' 
            }}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Section Header */}
      {selectedCategory && (
        <div 
          className="flex items-center justify-between p-6 rounded-3xl"
          style={{ background: `linear-gradient(135deg, ${categoryColor}10 0%, transparent 100%)` }}
        >
          <div>
            <h2 className="text-xl font-bold text-bloom-text">
              Foundations for {selectedCategory.name}
            </h2>
            <p className="text-bloom-text-secondary mt-1">
              Strengthen your {selectedCategory.name.toLowerCase()} fundamentals
            </p>
          </div>
          
          <div 
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: `${categoryColor}15` }}
          >
            <CategoryIcon size={40} style={{ color: categoryColor }} />
          </div>
        </div>
      )}
      
      {/* Course List */}
      <div className="space-y-3">
        {filteredCourses.map((course) => {
          const color = course.themeColor || categoryColor
          const Icon = categoryIcons[selectedCategory?.slug || 'logic'] || Brain
          
          return (
            <Card 
              key={course.id}
              hover
              onClick={() => navigate(`/courses/${course.id}`)}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${color}15` }}
                >
                  <Icon size={32} style={{ color }} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-bloom-text">{course.title}</h3>
                  {course.description && (
                    <p className="text-sm text-bloom-text-secondary mt-1 line-clamp-2">
                      {course.description}
                    </p>
                  )}
                </div>
                
                <ChevronRight size={20} className="text-bloom-text-muted flex-shrink-0" />
              </div>
            </Card>
          )
        })}
        
        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-bloom-text-secondary">No courses in this category yet.</p>
          </div>
        )}
      </div>
    </div>
  )
}
