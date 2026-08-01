import { NavLink } from 'react-router-dom'
import { useState } from 'react'

const navItems = [
  {
    to: '/explorer',
    label: 'Explorer',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    to: '/dashboards',
    label: 'Dashboards',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 12l3-3 3 3 4-4M8 21h8M12 17v4M3 4h18M4 4v10a2 2 0 002 2h12a2 2 0 002-2V4" />
      </svg>
    ),
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    to: '/sync',
    label: 'Sync',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={`flex flex-col border-r transition-all duration-300 ease-out print:hidden ${collapsed ? 'w-[68px]' : 'w-[220px]'
        }`}
      style={{
        background: 'var(--color-surface-800)',
        borderColor: 'var(--color-border)',
      }}
    >
      {/* Brand */}
      <div className={`flex items-center h-16 border-b transition-all duration-300 ${collapsed ? 'justify-center' : 'px-4 justify-start'}`} style={{ borderColor: 'var(--color-border)' }}>
        {collapsed ? (
          <img
            src="/favicon.jpg"
            alt="DF Agency Icon"
            className="w-8 h-8 rounded-lg object-cover shrink-0"
          />
        ) : (
          <img
            src="/logo-sin-fondo.png"
            alt="DF Agency Logo"
            className="h-10 w-auto max-w-[170px] object-contain animate-fade-in"
          />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${isActive
                ? 'text-white'
                : 'hover:bg-[var(--color-surface-700)]'
              }`
            }
            style={({ isActive }) => ({
              color: isActive ? 'white' : 'var(--color-text-secondary)',
              background: isActive ? 'var(--color-accent-primary)' : undefined,
              boxShadow: isActive ? '0 0 20px var(--color-accent-glow)' : undefined,
            })}
          >
            <span className="shrink-0">{item.icon}</span>
            {!collapsed && <span className="animate-fade-in">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="mx-2 mb-3 p-2 rounded-lg transition-colors cursor-pointer"
        style={{
          color: 'var(--color-text-muted)',
          background: 'transparent',
          border: 'none',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-700)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <svg
          className={`w-4 h-4 mx-auto transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
    </aside>
  )
}
