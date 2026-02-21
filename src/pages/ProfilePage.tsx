import { useAuth } from '../context/AuthContext'
import { 
  Flame, BookOpen, Star, Bell, Clock, Globe, 
  HelpCircle, FileText, LogOut, Crown, ChevronRight 
} from 'lucide-react'
import Card from '../components/Card'

export default function ProfilePage() {
  const { user, stats, logout } = useAuth()
  
  const initials = user?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'B'
  
  const settingsItems = [
    { icon: Bell, label: 'Notifications', color: '#FF6B35' },
    { icon: Clock, label: 'Daily Goal', color: '#4A90D9' },
    { icon: Globe, label: 'Language', color: '#4CAF50' },
    { icon: HelpCircle, label: 'Help & Support', color: '#9B59B6' },
    { icon: FileText, label: 'Terms & Privacy', color: '#6B7280' },
  ]
  
  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      {/* Profile Header */}
      <div className="text-center">
        <div className="w-24 h-24 mx-auto rounded-full bg-bloom-orange/15 flex items-center justify-center mb-4">
          <span className="text-3xl font-bold text-bloom-orange">{initials}</span>
        </div>
        
        <h1 className="text-2xl font-bold text-bloom-text">{user?.name}</h1>
        <p className="text-bloom-text-secondary">{user?.email}</p>
        
        {user?.isPremium && (
          <span className="inline-flex items-center gap-1.5 mt-3 px-4 py-1.5 rounded-full bg-bloom-yellow/15 text-bloom-yellow font-medium">
            <Crown size={16} />
            Premium
          </span>
        )}
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard 
          value={stats?.streak?.currentStreak ?? 0}
          label="Day Streak"
          icon={Flame}
          color="#FF6B35"
        />
        <StatCard 
          value={stats?.completedLessons ?? 0}
          label="Lessons"
          icon={BookOpen}
          color="#4A90D9"
        />
        <StatCard 
          value={stats?.totalScore ?? 0}
          label="XP"
          icon={Star}
          color="#FFB800"
        />
      </div>
      
      {/* Settings */}
      <Card className="p-0 overflow-hidden">
        {settingsItems.map((item, index) => (
          <button
            key={item.label}
            className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors ${
              index !== 0 ? 'border-t border-gray-100' : ''
            }`}
          >
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${item.color}15` }}
            >
              <item.icon size={20} style={{ color: item.color }} />
            </div>
            <span className="flex-1 text-left font-medium text-bloom-text">{item.label}</span>
            <ChevronRight size={20} className="text-bloom-text-muted" />
          </button>
        ))}
      </Card>
      
      {/* Logout */}
      <button
        onClick={logout}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut size={20} />
        <span className="font-medium">Log Out</span>
      </button>
    </div>
  )
}

interface StatCardProps {
  value: number
  label: string
  icon: React.ElementType
  color: string
}

function StatCard({ value, label, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="text-center py-5">
      <Icon size={24} style={{ color }} className="mx-auto mb-2" />
      <div className="text-2xl font-bold text-bloom-text">{value}</div>
      <div className="text-xs text-bloom-text-secondary">{label}</div>
    </Card>
  )
}
