const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

export interface User {
  id: string
  email: string
  name: string
  avatarUrl?: string
  energy: number
  isPremium: boolean
}

export interface UserStats {
  streak: { currentStreak: number; longestStreak: number } | null
  energy: number
  completedLessons: number
  totalScore: number
}

export interface Category {
  id: string
  name: string
  slug: string
  orderIndex: number
}

export interface Course {
  id: string
  categoryId: string
  title: string
  description?: string
  iconUrl?: string
  themeColor?: string
  lessonCount: number
  exerciseCount: number
  isRecommended: boolean
  collaborators?: string[]
  creatorName?: string
  aiInvolvement?: 'none' | 'collaboration' | 'full'
}

export interface CourseWithLevels extends Course {
  levels: Level[]
}

export interface Level {
  id: string
  courseId: string
  title: string
  orderIndex: number
  lessons: Lesson[]
}

// ── Unified Lesson Type ──
// A single Lesson type for both official (Bloom team) and user-created lessons.

export interface Lesson {
  id: string
  levelId?: string | null
  authorId?: string | null
  title: string
  description?: string | null
  iconUrl?: string | null
  themeColor?: string
  type: string
  orderIndex: number
  isOfficial: boolean
  visibility: string
  status: string
  editPolicy: string
  aiInvolvement: string
  tags: string[]
  ratingSum: number
  ratingCount: number
  viewCount: number
  isPromoted: boolean
  publishedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface LessonSummary extends Lesson {
  authorName: string
  pageCount: number
  averageRating: number
}

export interface LessonModule {
  id: string
  title: string
  description?: string | null
  orderIndex: number
  content: LessonContent[]
}

export interface LessonWithContent extends Lesson {
  modules: LessonModule[]
  content: LessonContent[]
  // Extra metadata that comes from the play/detail endpoints
  authorName?: string
  authorAvatarUrl?: string | null
  creatorName?: string
}

export interface LessonContent {
  id: string
  lessonId: string
  moduleId?: string | null
  orderIndex: number
  contentType: string
  contentData: ContentData
  authorId?: string | null
  sources?: SourceReference[]
  createdAt?: string
  updatedAt?: string
}

// ── Rich Content Types ──

export interface TextSegment {
  text: string
  bold?: boolean
  italic?: boolean
  color?: 'accent' | 'secondary' | 'success' | 'warning' | 'blue' | 'purple'
  underline?: boolean
  definition?: string
  latex?: boolean
}

export type ContentBlock =
  | { type: 'heading'; segments: TextSegment[]; level?: 1 | 2 | 3 }
  | { type: 'paragraph'; segments: TextSegment[] }
  | { type: 'image'; src: string; alt?: string; caption?: string; style?: 'full' | 'inline' | 'icon' }
  | { type: 'math'; latex: string; caption?: string }
  | { type: 'callout'; style: 'info' | 'tip' | 'warning' | 'example'; title?: string; segments: TextSegment[] }
  | { type: 'bulletList'; items: TextSegment[][] }
  | { type: 'animation'; src: string; autoplay?: boolean; loop?: boolean; caption?: string }
  | { type: 'interactive'; componentId: string; props?: Record<string, unknown> }
  | { type: 'spacer'; size?: 'sm' | 'md' | 'lg' }
  | { type: 'divider' }

export type ContentData =
  | { type: 'page'; blocks: ContentBlock[] }
  | { type: 'question'; question: string; questionSegments?: TextSegment[]; options: string[]; optionSegments?: TextSegment[][]; correctIndex: number; explanation?: string; explanationSegments?: TextSegment[] }
  // Legacy types for backward compatibility
  | { type: 'text'; text: string; formatting?: { bold?: boolean } }
  | { type: 'image'; url: string; caption?: string }

export interface UserProgress {
  id: string
  lessonId: string
  completed: boolean
  score?: number
}

export interface SourceReference {
  title: string
  url?: string
  description?: string
}

export interface TagInfo {
  tag: string
  count: number
}

export interface EditSuggestion {
  id: string
  lessonId: string
  contentId?: string
  suggesterId: string
  suggestedData: unknown
  status: 'pending' | 'approved' | 'rejected'
  reviewerId?: string
  reviewedAt?: string
  suggesterName: string
  createdAt: string
}

export interface ContentPageMetadata {
  contentId: string
  moduleId?: string | null
  authorName: string
  authorAvatarUrl?: string
  sources: SourceReference[]
  lastEdited: string
  editors: { name: string; avatarUrl?: string; editedAt: string }[]
}

export interface LessonMetadata {
  lesson: {
    authorName: string
    authorAvatarUrl?: string
    totalEdits: number
    createdAt: string
    updatedAt: string
    aiInvolvement: string
  }
  modules?: { id: string; title: string; description: string | null }[]
  pages: ContentPageMetadata[]
}

// ── AI Generation Types ──

export interface ModulePlan {
  title: string
  description: string
  pageCount: number
  outline: string
}

export interface LessonPlan {
  title: string
  description: string
  tags: string[]
  modules: ModulePlan[]
}

export interface GeneratedModule {
  title: string
  description: string
  pages: ContentData[]
}

export interface GeneratedLesson {
  title: string
  description: string
  tags: string[]
  modules: GeneratedModule[]
}


class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }
    const token = localStorage.getItem('bloom_token')
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: this.getHeaders(),
    })
    
    const data = await res.json()
    
    if (!res.ok) {
      throw new Error(data.error?.message || 'Request failed')
    }
    
    return data.data
  }

  // Auth
  async login(email: string, password: string) {
    return this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async register(name: string, email: string, password: string) {
    return this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
  }

  async getProfile() {
    return this.request<{ user: User }>('/auth/profile')
  }

  // Courses
  async getCategories() {
    return this.request<{ categories: Category[] }>('/courses/categories')
  }

  async getCourses() {
    return this.request<{ courses: Course[] }>('/courses')
  }

  async getRecommendedCourses() {
    return this.request<{ courses: Course[] }>('/courses/recommended')
  }

  async getCourse(id: string) {
    return this.request<{ course: CourseWithLevels }>(`/courses/${id}`)
  }

  async getLesson(id: string) {
    return this.request<{ lesson: LessonWithContent }>(`/courses/lessons/${id}`)
  }

  // Progress
  async getUserStats() {
    return this.request<{ stats: UserStats }>('/progress/stats').then(r => r.stats)
  }

  async getCourseProgress(courseId: string) {
    return this.request<{ progress: UserProgress[] }>(`/progress/course/${courseId}`)
  }

  async updateProgress(lessonId: string, completed: boolean, score?: number) {
    return this.request<{ progress: UserProgress }>('/progress/update', {
      method: 'POST',
      body: JSON.stringify({ lessonId, completed, score }),
    })
  }

  // ── Lessons (user-created) — maps to /api/workshop/* endpoints ──

  async getMyLessons() {
    return this.request<{ lessons: LessonSummary[] }>('/workshop/my-lessons')
  }

  async createLesson(data: {
    title: string
    description?: string
    iconUrl?: string
    themeColor?: string
    visibility?: string
    editPolicy?: string
    aiInvolvement?: string
    tags?: string[]
  }) {
    return this.request<{ lesson: Lesson }>('/workshop/lessons', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getEditableLesson(id: string) {
    return this.request<{ lesson: LessonWithContent }>(`/workshop/lessons/${id}`)
  }

  async updateLesson(id: string, data: Partial<{
    title: string
    description: string
    iconUrl: string
    themeColor: string
    visibility: string
    editPolicy: string
    aiInvolvement: string
    tags: string[]
  }>) {
    return this.request<{ lesson: Lesson }>(`/workshop/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteLesson(id: string) {
    return this.request<{ deleted: boolean }>(`/workshop/lessons/${id}`, {
      method: 'DELETE',
    })
  }

  async publishLesson(id: string) {
    return this.request<{ lesson: Lesson }>(`/workshop/lessons/${id}/publish`, {
      method: 'POST',
    })
  }

  async playLesson(id: string) {
    return this.request<{ lesson: LessonWithContent }>(`/workshop/lessons/${id}/play`)
  }

  // Modules
  async getLessonModules(lessonId: string) {
    return this.request<{ modules: LessonModule[] }>(`/workshop/lessons/${lessonId}/modules`)
  }

  async createLessonModule(lessonId: string, data: { title: string; description?: string }) {
    return this.request<{ module: LessonModule }>(`/workshop/lessons/${lessonId}/modules`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateLessonModule(moduleId: string, data: { title?: string; description?: string }) {
    return this.request<{ module: LessonModule }>(`/workshop/modules/${moduleId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteLessonModule(moduleId: string) {
    return this.request<{ deleted: boolean }>(`/workshop/modules/${moduleId}`, {
      method: 'DELETE',
    })
  }

  async reorderLessonModules(lessonId: string, moduleIds: string[]) {
    return this.request<{ reordered: boolean }>(`/workshop/lessons/${lessonId}/modules/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ moduleIds }),
    })
  }

  // Content pages
  async addLessonContent(lessonId: string, data: {
    contentType: string
    contentData: ContentData
    moduleId?: string
    sources?: SourceReference[]
  }) {
    return this.request<{ content: LessonContent }>(`/workshop/lessons/${lessonId}/content`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateLessonContent(lessonId: string, contentId: string, data: {
    contentType?: string
    contentData?: ContentData
    sources?: SourceReference[]
  }) {
    return this.request<{ content: LessonContent }>(`/workshop/lessons/${lessonId}/content/${contentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async reorderLessonContent(lessonId: string, contentIds: string[]) {
    return this.request<{ reordered: boolean }>(`/workshop/lessons/${lessonId}/content/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ contentIds }),
    })
  }

  async deleteLessonContent(lessonId: string, contentId: string) {
    return this.request<{ deleted: boolean }>(`/workshop/lessons/${lessonId}/content/${contentId}`, {
      method: 'DELETE',
    })
  }

  // Metadata & History
  async getLessonMetadataWorkshop(lessonId: string) {
    return this.request<{ metadata: LessonMetadata }>(`/workshop/lessons/${lessonId}/metadata`)
  }

  async getLessonMetadata(lessonId: string) {
    return this.request<{ metadata: LessonMetadata }>(`/courses/lessons/${lessonId}/metadata`)
  }

  async getLessonEditHistory(lessonId: string) {
    return this.request<{ history: unknown[] }>(`/workshop/lessons/${lessonId}/history`)
  }

  // Edit Suggestions
  async submitEditSuggestion(lessonId: string, data: {
    contentId?: string
    suggestedData: unknown
  }) {
    return this.request<{ suggestion: EditSuggestion }>(`/workshop/lessons/${lessonId}/suggest`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getEditSuggestions(lessonId: string, status?: string) {
    const query = status ? `?status=${status}` : ''
    return this.request<{ suggestions: EditSuggestion[] }>(`/workshop/lessons/${lessonId}/suggestions${query}`)
  }

  async reviewEditSuggestion(suggestionId: string, action: 'approved' | 'rejected') {
    return this.request<{ suggestion: EditSuggestion }>(`/workshop/suggestions/${suggestionId}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    })
  }

  // AI Generation
  async generateAIDraft(topic: string, pageCount?: number) {
    return this.request<GeneratedLesson>('/workshop/ai-draft', {
      method: 'POST',
      body: JSON.stringify({ topic, pageCount }),
    })
  }

  async generateAIPlan(topic: string, moduleCount?: number) {
    return this.request<{ plan: LessonPlan }>('/workshop/ai-plan', {
      method: 'POST',
      body: JSON.stringify({ topic, moduleCount }),
    })
  }

  async generateAIModuleContent(data: {
    lessonTitle: string
    lessonDescription: string
    modulePlan: ModulePlan
    moduleIndex: number
    totalModules: number
  }) {
    return this.request<{ pages: ContentData[] }>('/workshop/ai-module-content', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // Browse public lessons
  async browseLessons(opts?: { search?: string; tag?: string; limit?: number; offset?: number; sort?: 'recent' | 'rating' | 'popular' }) {
    const params = new URLSearchParams()
    if (opts?.search) params.set('search', opts.search)
    if (opts?.tag) params.set('tag', opts.tag)
    if (opts?.limit) params.set('limit', String(opts.limit))
    if (opts?.offset) params.set('offset', String(opts.offset))
    if (opts?.sort) params.set('sort', opts.sort)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<{ lessons: LessonSummary[]; total: number }>(`/workshop/browse${query}`)
  }

  async getPopularTags(limit?: number) {
    const query = limit ? `?limit=${limit}` : ''
    return this.request<{ tags: TagInfo[] }>(`/workshop/tags/popular${query}`)
  }

  async getLessonsByTag(tag: string, limit?: number) {
    const query = limit ? `?limit=${limit}` : ''
    return this.request<{ lessons: LessonSummary[] }>(`/workshop/tags/${encodeURIComponent(tag)}/lessons${query}`)
  }

  async rateLesson(id: string, rating: number) {
    return this.request<{ averageRating: number; ratingCount: number }>(`/workshop/lessons/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    })
  }

}

export const api = new ApiClient()
