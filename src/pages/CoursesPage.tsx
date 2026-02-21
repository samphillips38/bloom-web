import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Brain, Palette, Calculator, Atom, Code, ChevronRight, Music, Zap,
  Search, Tag, TrendingUp, X,
} from 'lucide-react'
import { api, Category, Course, WorkshopLessonSummary, TagInfo } from '../lib/api'
import Card from '../components/Card'
import { AIBadge, CreatorTag } from './WorkshopPage'

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

// Map category slugs to tags for cross-referencing
const categoryTagMap: Record<string, string> = {
  logic: 'logic',
  writing: 'writing',
  math: 'math',
  science: 'science',
  cs: 'computer science',
  music: 'music',
  physics: 'physics',
}

export default function CoursesPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [categories, setCategories] = useState<Category[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [popularTags, setPopularTags] = useState<TagInfo[]>([])
  const [selectedTab, setSelectedTab] = useState<string>('all')
  const [communityLessons, setCommunityLessons] = useState<WorkshopLessonSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<WorkshopLessonSummary[] | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  // Handle URL param for tag
  useEffect(() => {
    const tagParam = searchParams.get('tag')
    if (tagParam) {
      setSelectedTab(`tag:${tagParam}`)
    }
  }, [searchParams])

  // Load community lessons when tab changes
  useEffect(() => {
    if (selectedTab === 'all') {
      loadCommunityLessons()
    } else if (selectedTab.startsWith('tag:')) {
      const tag = selectedTab.replace('tag:', '')
      loadLessonsByTag(tag)
    } else {
      // It's a category — try to load community lessons with matching tag
      const tag = categoryTagMap[selectedTab]
      if (tag) {
        loadLessonsByTag(tag)
      } else {
        setCommunityLessons([])
      }
    }
  }, [selectedTab])

  async function loadData() {
    try {
      const [categoriesRes, coursesRes, tagsRes] = await Promise.all([
        api.getCategories(),
        api.getCourses(),
        api.getPopularTags(20),
      ])

      setCategories(categoriesRes.categories)
      setCourses(coursesRes.courses)
      setPopularTags(tagsRes.tags)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function loadCommunityLessons() {
    try {
      const result = await api.browseWorkshopLessons({ limit: 20, sort: 'rating' })
      setCommunityLessons(result.lessons)
    } catch (error) {
      console.error('Failed to load community lessons:', error)
    }
  }

  async function loadLessonsByTag(tag: string) {
    try {
      const result = await api.getLessonsByTag(tag, 20)
      setCommunityLessons(result.lessons)
    } catch (error) {
      console.error('Failed to load lessons by tag:', error)
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      setSearchResults(null)
      return
    }
    setIsSearching(true)
    try {
      const result = await api.browseWorkshopLessons({ search: searchQuery.trim(), limit: 30, sort: 'rating' })
      setSearchResults(result.lessons)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  function clearSearch() {
    setSearchQuery('')
    setSearchResults(null)
  }

  // Filter built-in courses by selected category
  const filteredCourses = selectedTab === 'all'
    ? courses
    : selectedTab.startsWith('tag:')
      ? [] // tag tabs only show community lessons
      : courses.filter(c => {
          const cat = categories.find(cat => cat.slug === selectedTab)
          return cat ? c.categoryId === cat.id : false
        })

  // Get display info for selected tab
  const selectedCategory = categories.find(c => c.slug === selectedTab)
  const selectedTag = selectedTab.startsWith('tag:') ? selectedTab.replace('tag:', '') : null
  const tabColor = selectedCategory
    ? categoryColors[selectedCategory.slug] || '#4A90D9'
    : selectedTag
      ? '#FF6B35'
      : '#4A90D9'
  const TabIcon = selectedCategory
    ? categoryIcons[selectedCategory.slug] || Brain
    : selectedTag ? Tag : TrendingUp

  // Merge unique tags (from popular tags, excluding those that match category slugs already shown)
  const categoryNames = new Set(Object.values(categoryTagMap))
  const uniqueTags = popularTags.filter(pt => !categoryNames.has(pt.tag))

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bloom-blue border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-bloom-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search all courses..."
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-bloom-orange/30 text-sm"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={14} className="text-bloom-text-muted" />
            </button>
          )}
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 rounded-xl bg-bloom-orange text-white font-medium text-sm hover:opacity-90 transition-opacity"
        >
          Search
        </button>
      </div>

      {/* Search Results */}
      {searchResults !== null ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-bloom-text">
              Search Results <span className="text-sm font-normal text-bloom-text-muted">({searchResults.length})</span>
            </h2>
            <button
              onClick={clearSearch}
              className="text-sm text-bloom-orange font-medium hover:underline"
            >
              Clear
            </button>
          </div>
          {isSearching ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-bloom-orange border-t-transparent" />
            </div>
          ) : searchResults.length === 0 ? (
            <Card className="text-center py-10">
              <p className="text-bloom-text-secondary">No courses found for "{searchQuery}"</p>
              <p className="text-sm text-bloom-text-muted mt-1">Try a different search term</p>
            </Card>
          ) : (
            searchResults.map(lesson => (
              <CourseCard
                key={lesson.id}
                title={lesson.title}
                description={lesson.description}
                themeColor={lesson.themeColor || '#FF6B35'}
                creatorName={lesson.authorName}
                aiInvolvement={lesson.aiInvolvement}
                onClick={() => navigate(`/community/${lesson.id}`)}
                icon={Brain}
              />
            ))
          )}
        </div>
      ) : (
        <>
          {/* Topic Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {/* All tab */}
            <button
              onClick={() => { setSelectedTab('all'); setSearchParams({}) }}
              className={`px-4 py-2 whitespace-nowrap transition-all duration-200 border-b-2 ${
                selectedTab === 'all'
                  ? 'text-bloom-text font-semibold border-bloom-orange'
                  : 'text-bloom-text-secondary border-transparent hover:text-bloom-text'
              }`}
            >
              All
            </button>

            {/* Category tabs */}
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => { setSelectedTab(category.slug); setSearchParams({}) }}
                className={`px-4 py-2 whitespace-nowrap transition-all duration-200 border-b-2 ${
                  selectedTab === category.slug
                    ? 'text-bloom-text font-semibold'
                    : 'text-bloom-text-secondary border-transparent hover:text-bloom-text'
                }`}
                style={{
                  borderColor: selectedTab === category.slug
                    ? categoryColors[category.slug]
                    : 'transparent'
                }}
              >
                {category.name}
              </button>
            ))}

            {/* Popular tag tabs (that don't match categories) */}
            {uniqueTags.slice(0, 8).map((tagInfo) => (
              <button
                key={tagInfo.tag}
                onClick={() => { setSelectedTab(`tag:${tagInfo.tag}`); setSearchParams({ tag: tagInfo.tag }) }}
                className={`px-4 py-2 whitespace-nowrap transition-all duration-200 border-b-2 flex items-center gap-1 ${
                  selectedTab === `tag:${tagInfo.tag}`
                    ? 'text-bloom-text font-semibold border-bloom-orange'
                    : 'text-bloom-text-secondary border-transparent hover:text-bloom-text'
                }`}
              >
                <Tag size={12} />
                {tagInfo.tag}
              </button>
            ))}
          </div>

          {/* Section Header */}
          <div
            className="flex items-center justify-between p-6 rounded-3xl"
            style={{ background: `linear-gradient(135deg, ${tabColor}10 0%, transparent 100%)` }}
          >
            <div>
              <h2 className="text-xl font-bold text-bloom-text">
                {selectedTab === 'all'
                  ? 'All Courses'
                  : selectedCategory
                    ? selectedCategory.name
                    : selectedTag
                      ? selectedTag
                      : 'Courses'}
              </h2>
              <p className="text-bloom-text-secondary mt-1">
                {selectedTab === 'all'
                  ? 'Browse all available courses'
                  : selectedCategory
                    ? `Strengthen your ${selectedCategory.name.toLowerCase()} fundamentals`
                    : selectedTag
                      ? `Courses tagged "${selectedTag}"`
                      : 'Explore courses'}
              </p>
            </div>

            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${tabColor}15` }}
            >
              <TabIcon size={40} style={{ color: tabColor }} />
            </div>
          </div>

          {/* All Courses — official + community mixed together */}
          <div className="space-y-3">
            {/* Official courses */}
            {filteredCourses.map((course) => {
              const color = course.themeColor || tabColor
              const Icon = selectedCategory
                ? categoryIcons[selectedCategory.slug] || Brain
                : Brain

              return (
                <CourseCard
                  key={course.id}
                  title={course.title}
                  description={course.description}
                  themeColor={color}
                  creatorName={course.creatorName}
                  aiInvolvement={course.aiInvolvement}
                  onClick={() => navigate(`/courses/${course.id}`)}
                  icon={Icon}
                />
              )
            })}

            {/* Community courses — same card style as official */}
            {communityLessons.map((lesson) => {
              const color = lesson.themeColor || tabColor
              const Icon = selectedCategory
                ? categoryIcons[selectedCategory.slug] || Brain
                : Brain

              return (
                <CourseCard
                  key={lesson.id}
                  title={lesson.title}
                  description={lesson.description}
                  themeColor={color}
                  creatorName={lesson.authorName}
                  aiInvolvement={lesson.aiInvolvement}
                  onClick={() => navigate(`/community/${lesson.id}`)}
                  icon={Icon}
                />
              )
            })}

            {/* View All for tag/category tabs */}
            {selectedTab !== 'all' && communityLessons.length >= 10 && (
              <button
                onClick={() => {
                  const tag = selectedTag || categoryTagMap[selectedTab]
                  if (tag) {
                    navigate(`/workshop/browse?tag=${encodeURIComponent(tag)}`)
                  } else {
                    navigate('/workshop/browse')
                  }
                }}
                className="w-full flex items-center justify-center gap-1 py-3 text-sm font-medium text-bloom-orange hover:text-bloom-orange/80 transition-colors"
              >
                View All
                <ChevronRight size={16} />
              </button>
            )}
          </div>

          {/* Empty state */}
          {filteredCourses.length === 0 && communityLessons.length === 0 && (
            <div className="text-center py-12">
              <p className="text-bloom-text-secondary">No courses in this category yet.</p>
              <p className="text-sm text-bloom-text-muted mt-1">Be the first to create one in the Workshop!</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════
//  Unified Course Card — same look for official & community
// ═══════════════════════════════════════════════════════

function CourseCard({
  title,
  description,
  themeColor,
  creatorName,
  aiInvolvement,
  onClick,
  icon: Icon,
}: {
  title: string
  description?: string
  themeColor: string
  creatorName?: string
  aiInvolvement?: string
  onClick: () => void
  icon: React.ElementType
}) {
  return (
    <Card hover onClick={onClick}>
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${themeColor}15` }}
        >
          <Icon size={32} style={{ color: themeColor }} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-bloom-text">{title}</h3>
          {description && (
            <p className="text-sm text-bloom-text-secondary mt-1 line-clamp-2">
              {description}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {creatorName && <CreatorTag name={creatorName} size="sm" />}
            {aiInvolvement && <AIBadge involvement={aiInvolvement} size="sm" />}
          </div>
        </div>

        <ChevronRight size={20} className="text-bloom-text-muted flex-shrink-0" />
      </div>
    </Card>
  )
}
