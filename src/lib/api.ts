const API_BASE = '/api'

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

export type ContentData = 
  | { type: 'text'; text: string; formatting?: { bold?: boolean } }
  | { type: 'image'; url: string; caption?: string }
  | { type: 'question'; question: string; options: string[]; correctIndex: number; explanation?: string }

export interface UserProgress {
  id: string
  lessonId: string
  completed: boolean
  score?: number
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
}

export const api = new ApiClient()
