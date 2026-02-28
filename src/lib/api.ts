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

export interface Achievement {
  id: string
  title: string
  description: string
  emoji: string
  xpBonus: number
  earnedAt: string
}

export interface UserStats {
  streak: {
    currentStreak: number
    longestStreak: number
    lastActivityDate: string | null
    streakFreezeUsedDate: string | null
  } | null
  energy: number
  energyMax: number
  msUntilNextEnergyRefill: number
  streakFreezes: number
  completedLessons: number
  totalScore: number
  xp: number
  level: number
  xpForCurrentLevel: number
  xpForNextLevel: number
  dailyGoal: number
  dailyProgress: number
  achievements: Achievement[]
}

export interface LessonCompleteResult {
  progress: UserProgress
  xpEarned: number
  xpBonusFromAchievements: number
  newXp: number
  oldLevel: number
  newLevel: number
  leveledUp: boolean
  newStreak: number
  streakMilestone: number | null
  newAchievements: Omit<Achievement, 'earnedAt'>[]
  usedStreakFreeze: boolean
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
  prerequisites?: LessonStub[]
  nextLessons?: LessonStub[]
  userProgress?: UserProgress
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

export type QuestionFormat =
  | 'multiple-choice'
  | 'true-false'
  | 'multi-select'
  | 'fill-blank'
  | 'word-arrange'

export type ContentData =
  | { type: 'page'; blocks: ContentBlock[] }
  | { type: 'question'; format?: QuestionFormat; question: string; questionSegments?: TextSegment[]; options: string[]; optionSegments?: TextSegment[][]; correctIndex?: number; correctIndices?: number[]; correctAnswer?: string; explanation?: string; explanationSegments?: TextSegment[] }
  // Legacy types for backward compatibility
  | { type: 'text'; text: string; formatting?: { bold?: boolean } }
  | { type: 'image'; url: string; caption?: string }

export interface UserProgress {
  id: string
  lessonId: string
  completed: boolean
  score?: number
  lastPageIndex?: number
}

export interface LessonStub {
  id: string
  title: string
  description: string | null
  themeColor: string | null
  iconUrl: string | null
  tags: string[]
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

export interface LibraryItem {
  id: string
  type: 'lesson' | 'course'
  // Course fields
  courseId?: string
  courseTitle?: string
  courseDescription?: string
  courseThemeColor?: string
  courseLessonCount?: number
  // Lesson fields
  lessonId?: string
  lessonTitle?: string
  lessonDescription?: string
  lessonThemeColor?: string
  lessonPageCount?: number
  lessonAuthorName?: string
  lessonTags?: string[]
  // Progress
  progressPercent: number
  completedCount: number
  totalCount: number
  isCompleted: boolean
  // Metadata
  savedAt: string
  lastActivityAt?: string
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
  modules?: { id: string; title: string; description: string | null; sources: SourceReference[] }[]
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

export type GenerationStatus = 'pending' | 'searching' | 'planning' | 'reviewing' | 'generating' | 'completed' | 'failed'
export type GenerationSourceType = 'topic' | 'url' | 'pdf'

export interface GenerationJob {
  id: string
  lessonId: string
  userId: string
  status: GenerationStatus
  totalModules: number
  completedModules: number
  currentModuleTitle: string | null
  sourceType: GenerationSourceType
  discoveredSources: SourceReference[]
  error: string | null
  createdAt: string
  updatedAt: string
}


interface AuthTokens {
  user: User
  token: string
  refreshToken: string
}

class ApiClient {
  private accessToken: string | null = null
  private refreshToken: string | null = null
  private refreshPromise: Promise<boolean> | null = null

  constructor() {
    // Restore tokens from localStorage on init
    this.accessToken = localStorage.getItem('bloom_token')
    this.refreshToken = localStorage.getItem('bloom_refresh_token')
  }

  // ── Token Management ──

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
    localStorage.setItem('bloom_token', accessToken)
    localStorage.setItem('bloom_refresh_token', refreshToken)
  }

  clearTokens() {
    this.accessToken = null
    this.refreshToken = null
    localStorage.removeItem('bloom_token')
    localStorage.removeItem('bloom_refresh_token')
  }

  hasTokens(): boolean {
    return !!this.accessToken
  }

  private getHeaders(body?: BodyInit | null): HeadersInit {
    const headers: Record<string, string> = {}
    // Let the browser set Content-Type automatically for FormData (multipart boundary)
    if (!(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json'
    }
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`
    }
    return headers
  }

  // ── Core Request with Auto-Refresh ──

  private async request<T>(endpoint: string, options?: RequestInit, isRetry = false): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: this.getHeaders(options?.body),
      credentials: 'include', // send cookies for refresh token
    })

    // If 401 and we have a refresh token, try to refresh and retry once
    if (res.status === 401 && !isRetry && this.refreshToken) {
      const refreshed = await this.tryRefresh()
      if (refreshed) {
        return this.request<T>(endpoint, options, true)
      }
    }

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error?.message || 'Request failed')
    }

    return data.data
  }

  private async tryRefresh(): Promise<boolean> {
    // Deduplicate concurrent refresh calls
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        })

        if (!res.ok) {
          this.clearTokens()
          return false
        }

        const data = await res.json()
        if (data.data?.token && data.data?.refreshToken) {
          this.setTokens(data.data.token, data.data.refreshToken)
          return true
        }

        this.clearTokens()
        return false
      } catch {
        this.clearTokens()
        return false
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  // ── Auth Endpoints ──

  async login(email: string, password: string) {
    const result = await this.request<AuthTokens>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    this.setTokens(result.token, result.refreshToken)
    return result
  }

  async register(name: string, email: string, password: string) {
    const result = await this.request<AuthTokens>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    })
    this.setTokens(result.token, result.refreshToken)
    return result
  }

  async googleLogin(credential: string) {
    const result = await this.request<AuthTokens>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    })
    this.setTokens(result.token, result.refreshToken)
    return result
  }

  async appleLogin(idToken: string, user?: { name?: { firstName?: string; lastName?: string } }) {
    const result = await this.request<AuthTokens>('/auth/apple', {
      method: 'POST',
      body: JSON.stringify({ idToken, user }),
    })
    this.setTokens(result.token, result.refreshToken)
    return result
  }

  async logout() {
    try {
      await this.request<{ message: string }>('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      })
    } catch {
      // Logout should succeed even if API call fails
    } finally {
      this.clearTokens()
    }
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

  async getLessonProgress(lessonId: string) {
    return this.request<{ progress: UserProgress | null }>(`/progress/lesson/${lessonId}`)
  }

  async updateProgress(lessonId: string, completed: boolean, score?: number, lastPageIndex?: number) {
    // When completing a lesson the server returns a LessonCompleteResult;
    // for plain saves it returns { progress }. Cast broadly and let callers inspect.
    return this.request<LessonCompleteResult | { progress: UserProgress }>('/progress/update', {
      method: 'POST',
      body: JSON.stringify({ lessonId, completed, score, lastPageIndex }),
    })
  }

  async setDailyGoal(goal: number) {
    return this.request<{ goal: number }>('/progress/daily-goal', {
      method: 'POST',
      body: JSON.stringify({ goal }),
    })
  }

  async getAchievements() {
    return this.request<{ achievements: Achievement[]; all: Omit<Achievement, 'earnedAt'>[] }>('/progress/achievements')
  }

  async addStreakFreeze(count = 1) {
    return this.request<{ streakFreezes: number }>('/progress/streak-freeze/add', {
      method: 'POST',
      body: JSON.stringify({ count }),
    })
  }

  async restoreEnergy() {
    return this.request<{ energy: number }>('/progress/energy/restore', { method: 'POST' })
  }

  async savePage(lessonId: string, pageIndex: number) {
    return this.request<{ saved: boolean }>('/progress/save-page', {
      method: 'POST',
      body: JSON.stringify({ lessonId, pageIndex }),
    })
  }

  async addPrerequisite(lessonId: string, prereqId: string) {
    return this.request<{ added: boolean }>(`/workshop/lessons/${lessonId}/prerequisites`, {
      method: 'POST',
      body: JSON.stringify({ prerequisiteLessonId: prereqId }),
    })
  }

  async removePrerequisite(lessonId: string, prereqId: string) {
    return this.request<{ removed: boolean }>(`/workshop/lessons/${lessonId}/prerequisites/${prereqId}`, {
      method: 'DELETE',
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

  async generateAIPlan(topic: string) {
    return this.request<{ plan: LessonPlan }>('/workshop/ai-plan', {
      method: 'POST',
      body: JSON.stringify({ topic }),
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

  // ── Async AI Generation ──

  /**
   * Start a background AI generation job.
   * Returns immediately with { lessonId, jobId }.
   */
  async startAIGeneration(data: {
    topic: string
    sourceType?: GenerationSourceType
    /** For 'url': the URL string. For 'pdf': pass the File object directly. For 'topic': omit. */
    pdfFile?: File
    sourceContent?: string
    lessonId?: string
  }) {
    // PDF uploads must be sent as multipart/form-data so Express can handle large files
    if (data.sourceType === 'pdf' && data.pdfFile) {
      const form = new FormData()
      form.append('topic', data.topic)
      form.append('sourceType', 'pdf')
      form.append('pdf', data.pdfFile)
      if (data.lessonId) form.append('lessonId', data.lessonId)
      // Let the browser set the Content-Type with the correct boundary
      return this.request<{ lessonId: string; jobId: string }>('/workshop/ai-generate', {
        method: 'POST',
        body: form,
      })
    }

    return this.request<{ lessonId: string; jobId: string }>('/workshop/ai-generate', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Poll the status of a generation job for a lesson.
   */
  async getGenerationStatus(lessonId: string) {
    return this.request<{ job: GenerationJob | null }>(`/workshop/lessons/${lessonId}/generation-status`)
  }

  // ── Library ──

  async getLibrary() {
    return this.request<{ items: LibraryItem[] }>('/library')
  }

  async addCourseToLibrary(courseId: string) {
    return this.request<{ saved: boolean }>(`/library/course/${courseId}`, { method: 'POST' })
  }

  async removeCourseFromLibrary(courseId: string) {
    return this.request<{ removed: boolean }>(`/library/course/${courseId}`, { method: 'DELETE' })
  }

  async checkCourseInLibrary(courseId: string) {
    return this.request<{ saved: boolean }>(`/library/course/${courseId}/check`)
  }

  async addLessonToLibrary(lessonId: string) {
    return this.request<{ saved: boolean }>(`/library/lesson/${lessonId}`, { method: 'POST' })
  }

  async removeLessonFromLibrary(lessonId: string) {
    return this.request<{ removed: boolean }>(`/library/lesson/${lessonId}`, { method: 'DELETE' })
  }

  async checkLessonInLibrary(lessonId: string) {
    return this.request<{ saved: boolean }>(`/library/lesson/${lessonId}/check`)
  }

}

export const api = new ApiClient()
