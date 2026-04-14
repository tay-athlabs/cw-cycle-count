import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const NAV_LINKS = [
  { path: '/',            label: 'Overview'  },
  { path: '/analytics',  label: 'Analytics' },
  { path: '/history',    label: 'History'   },
  { path: '/sku-master', label: 'SKU — beta' },
]

export default function NavBar() {
  const { user, logout } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()

  const initials = user?.name
    ? user.name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
    : 'CW'

  const isActive = (path) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  return (
    <nav className="navbar">
      <div className="navbar-brand" onClick={() => navigate('/')} style={{ cursor:'pointer' }}>
        <div className="navbar-logo">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="1" y="1" width="6" height="6" rx="1.5" fill="white"/>
            <rect x="9" y="1" width="6" height="6" rx="1.5" fill="white" fillOpacity=".6"/>
            <rect x="1" y="9" width="6" height="6" rx="1.5" fill="white" fillOpacity=".6"/>
            <rect x="9" y="9" width="6" height="6" rx="1.5" fill="white" fillOpacity=".3"/>
          </svg>
        </div>
        <div>
          <div className="navbar-title">CW Cycle Count</div>
          <div className="navbar-sub">EU Operations</div>
        </div>
      </div>

      <div className="navbar-spacer" />

      <div className="navbar-nav">
        {NAV_LINKS.map(({ path, label }) => (
          <button
            key={path}
            className={`nav-link${isActive(path) ? ' active' : ''}`}
            onClick={() => navigate(path)}
          >
            {label}
          </button>
        ))}
        <button
          className="btn btn-primary btn-sm"
          onClick={() => navigate('/session/new')}
          style={{ marginLeft: 8 }}
        >
          + New count
        </button>
      </div>

      <div className="navbar-spacer" style={{ maxWidth: 16 }} />

      <div className="navbar-user" onClick={logout} title="Sign out">
        <div className="user-avatar">
          {user?.picture
            ? <img src={user.picture} alt={user.name} />
            : initials
          }
        </div>
        <div>
          <div className="user-name">{user?.name || 'User'}</div>
          <div className="user-email">{user?.email || ''}</div>
        </div>
      </div>
    </nav>
  )
}
