import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import CoursesPage from './pages/CoursesPage'
import CourseDetailPage from './pages/CourseDetailPage'
import LessonPage from './pages/LessonPage'
import LessonOverviewPage from './pages/CommunityCoursePage'
import PremiumPage from './pages/PremiumPage'
import ProfilePage from './pages/ProfilePage'
import WorkshopPage from './pages/WorkshopPage'
import WorkshopEditorPage from './pages/WorkshopEditorPage'
import ModuleEditorPage from './pages/ModuleEditorPage'
import WorkshopBrowsePage from './pages/WorkshopBrowsePage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-bloom-orange border-t-transparent" />
      </div>
    )
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />
  }
  
  return <>{children}</>
}

function App() {
  const { isAuthenticated } = useAuth()
  
  return (
    <Routes>
      <Route path="/auth" element={isAuthenticated ? <Navigate to="/" replace /> : <AuthPage />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<HomePage />} />
        <Route path="courses" element={<CoursesPage />} />
        <Route path="courses/:courseId" element={<CourseDetailPage />} />
        <Route path="workshop" element={<WorkshopPage />} />
        <Route path="workshop/new" element={<WorkshopEditorPage />} />
        <Route path="workshop/edit/:lessonId" element={<WorkshopEditorPage />} />
        <Route path="workshop/edit/:lessonId/module/:moduleId" element={<ModuleEditorPage />} />
        <Route path="workshop/browse" element={<WorkshopBrowsePage />} />
        <Route path="lesson/:lessonId/overview" element={<LessonOverviewPage />} />
        <Route path="premium" element={<PremiumPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>
      
      <Route path="/lesson/:lessonId" element={
        <ProtectedRoute>
          <LessonPage />
        </ProtectedRoute>
      } />
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
