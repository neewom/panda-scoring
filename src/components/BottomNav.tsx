import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/new-game', label: 'Nouvelle partie', icon: '🎮' },
  { to: '/history', label: 'Historique', icon: '📜' },
  { to: '/players', label: 'Joueurs', icon: '👥' },
  { to: '/settings', label: 'Paramètres', icon: '⚙️' },
]

export default function BottomNav() {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed bottom-0 left-0 right-0 z-50 flex items-stretch bg-white/90 backdrop-blur-md border-t border-purple-100 shadow-[0_-2px_16px_0_rgba(139,92,246,0.08)] pb-[env(safe-area-inset-bottom)]"
    >
      {navItems.map(({ to, label, icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          aria-label={label}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-medium transition-colors',
              isActive
                ? 'text-purple-700'
                : 'text-purple-300 hover:text-purple-500'
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-xl text-lg transition-all',
                  isActive && 'bg-purple-100 scale-110'
                )}
              >
                {icon}
              </span>
              <span className={cn(isActive && 'font-semibold')}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
