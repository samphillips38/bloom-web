import { Outlet, NavLink } from 'react-router-dom'
import { Home, BookOpen, Crown, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import StatBadge from './StatBadge'

export default function Layout() {
  const { stats } = useAuth()
  
  return (
    <div className="min-h-screen bg-bloom-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-bloom-orange flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="font-bold text-xl text-bloom-text">Bloom</span>
          </div>
          
          <div className="flex items-center gap-3">
            <StatBadge 
              value={stats?.streak?.currentStreak ?? 0} 
              icon="flame" 
              color="orange" 
            />
            <StatBadge 
              value={stats?.energy ?? 5} 
              icon="bolt" 
              color="yellow" 
            />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        <Outlet />
      </main>
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-50">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex items-center justify-around py-2">
            <NavItem to="/" icon={Home} label="Home" />
            <NavItem to="/courses" icon={BookOpen} label="Courses" />
            <NavItem to="/premium" icon={Crown} label="Premium" />
            <NavItem to="/profile" icon={User} label="You" />
          </div>
        </div>
      </nav>
    </div>
  )
}

function NavItem({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200 ${
          isActive 
            ? 'text-bloom-text bg-gray-100' 
            : 'text-bloom-text-muted hover:text-bloom-text-secondary'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
          <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>{label}</span>
        </>
      )}
    </NavLink>
  )
}
