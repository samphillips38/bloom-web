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

export interface Lesson {
  id: string
  levelId: string
  title: string
  iconUrl?: string
  type: string
  orderIndex: number
}

export interface LessonWithContent extends Lesson {
  content: LessonContent[]
}

export interface LessonContent {
  id: string
  lessonId: string
  orderIndex: number
  contentType: string
  contentData: ContentData
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

// ── Workshop Types ──

export interface WorkshopLesson {
  id: string
  authorId: string
  title: string
  description?: string
  iconUrl?: string
  themeColor?: string
  visibility: 'private' | 'public'
  status: 'draft' | 'published'
  editPolicy: 'open' | 'approval'
  aiInvolvement: 'none' | 'collaboration' | 'full'
  tags: string[]
  ratingSum: number
  ratingCount: number
  viewCount: number
  isPromoted: boolean
  publishedAt?: string
  createdAt: string
  updatedAt: string
}

export interface WorkshopLessonSummary extends WorkshopLesson {
  authorName: string
  pageCount: number
  averageRating: number
}

export interface TagInfo {
  tag: string
  count: number
}

export interface WorkshopLessonPlayData extends LessonWithContent {
  authorName: string
  authorAvatarUrl?: string
  description?: string
  themeColor?: string
  aiInvolvement: string
  tags: string[]
  creatorName: string
}

export interface WorkshopLessonContent {
  id: string
  workshopLessonId: string
  orderIndex: number
  contentType: string
  contentData: ContentData
  authorId: string
  sources: SourceReference[]
  createdAt: string
  updatedAt: string
}

export interface WorkshopLessonWithContent extends WorkshopLesson {
  content: WorkshopLessonContent[]
  authorName: string
  authorAvatarUrl?: string
}

export interface SourceReference {
  title: string
  url?: string
  description?: string
}

export interface WorkshopEditSuggestion {
  id: string
  workshopLessonId: string
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
  pages: ContentPageMetadata[]
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

  // Workshop
  async getMyWorkshopLessons() {
    return this.request<{ lessons: WorkshopLessonSummary[] }>('/workshop/my-lessons')
  }

  async createWorkshopLesson(data: {
    title: string
    description?: string
    iconUrl?: string
    themeColor?: string
    visibility?: string
    editPolicy?: string
    aiInvolvement?: string
    tags?: string[]
  }) {
    return this.request<{ lesson: WorkshopLesson }>('/workshop/lessons', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getWorkshopLesson(id: string) {
    return this.request<{ lesson: WorkshopLessonWithContent }>(`/workshop/lessons/${id}`)
  }

  async updateWorkshopLesson(id: string, data: Partial<{
    title: string
    description: string
    iconUrl: string
    themeColor: string
    visibility: string
    editPolicy: string
    aiInvolvement: string
    tags: string[]
  }>) {
    return this.request<{ lesson: WorkshopLesson }>(`/workshop/lessons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteWorkshopLesson(id: string) {
    return this.request<{ deleted: boolean }>(`/workshop/lessons/${id}`, {
      method: 'DELETE',
    })
  }

  async publishWorkshopLesson(id: string) {
    return this.request<{ lesson: WorkshopLesson }>(`/workshop/lessons/${id}/publish`, {
      method: 'POST',
    })
  }

  async addWorkshopContent(lessonId: string, data: {
    contentType: string
    contentData: ContentData
    sources?: SourceReference[]
  }) {
    return this.request<{ content: WorkshopLessonContent }>(`/workshop/lessons/${lessonId}/content`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async updateWorkshopContent(lessonId: string, contentId: string, data: {
    contentType?: string
    contentData?: ContentData
    sources?: SourceReference[]
  }) {
    return this.request<{ content: WorkshopLessonContent }>(`/workshop/lessons/${lessonId}/content/${contentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async reorderWorkshopContent(lessonId: string, contentIds: string[]) {
    return this.request<{ reordered: boolean }>(`/workshop/lessons/${lessonId}/content/reorder`, {
      method: 'PUT',
      body: JSON.stringify({ contentIds }),
    })
  }

  async deleteWorkshopContent(lessonId: string, contentId: string) {
    return this.request<{ deleted: boolean }>(`/workshop/lessons/${lessonId}/content/${contentId}`, {
      method: 'DELETE',
    })
  }

  async getWorkshopLessonMetadata(lessonId: string) {
    return this.request<{ metadata: LessonMetadata }>(`/workshop/lessons/${lessonId}/metadata`)
  }

  async getLessonMetadata(lessonId: string) {
    return this.request<{ metadata: LessonMetadata }>(`/courses/lessons/${lessonId}/metadata`)
  }

  async getWorkshopEditHistory(lessonId: string) {
    return this.request<{ history: unknown[] }>(`/workshop/lessons/${lessonId}/history`)
  }

  async submitEditSuggestion(lessonId: string, data: {
    contentId?: string
    suggestedData: unknown
  }) {
    return this.request<{ suggestion: WorkshopEditSuggestion }>(`/workshop/lessons/${lessonId}/suggest`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async getEditSuggestions(lessonId: string, status?: string) {
    const query = status ? `?status=${status}` : ''
    return this.request<{ suggestions: WorkshopEditSuggestion[] }>(`/workshop/lessons/${lessonId}/suggestions${query}`)
  }

  async reviewEditSuggestion(suggestionId: string, action: 'approved' | 'rejected') {
    return this.request<{ suggestion: WorkshopEditSuggestion }>(`/workshop/suggestions/${suggestionId}`, {
      method: 'PUT',
      body: JSON.stringify({ action }),
    })
  }

  async generateAIDraft(topic: string, pageCount?: number) {
    return this.request<{ pages: ContentData[]; tags: string[] }>('/workshop/ai-draft', {
      method: 'POST',
      body: JSON.stringify({ topic, pageCount }),
    })
  }

  async browseWorkshopLessons(opts?: { search?: string; tag?: string; limit?: number; offset?: number; sort?: 'recent' | 'rating' | 'popular' }) {
    const params = new URLSearchParams()
    if (opts?.search) params.set('search', opts.search)
    if (opts?.tag) params.set('tag', opts.tag)
    if (opts?.limit) params.set('limit', String(opts.limit))
    if (opts?.offset) params.set('offset', String(opts.offset))
    if (opts?.sort) params.set('sort', opts.sort)
    const query = params.toString() ? `?${params.toString()}` : ''
    return this.request<{ lessons: WorkshopLessonSummary[]; total: number }>(`/workshop/browse${query}`)
  }

  async getPopularTags(limit?: number) {
    const query = limit ? `?limit=${limit}` : ''
    return this.request<{ tags: TagInfo[] }>(`/workshop/tags/popular${query}`)
  }

  async getLessonsByTag(tag: string, limit?: number) {
    const query = limit ? `?limit=${limit}` : ''
    return this.request<{ lessons: WorkshopLessonSummary[] }>(`/workshop/tags/${encodeURIComponent(tag)}/lessons${query}`)
  }

  async playWorkshopLesson(id: string) {
    return this.request<{ lesson: WorkshopLessonPlayData }>(`/workshop/lessons/${id}/play`)
  }

  async rateWorkshopLesson(id: string, rating: number) {
    return this.request<{ averageRating: number; ratingCount: number }>(`/workshop/lessons/${id}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    })
  }
}

export const api = new ApiClient()
