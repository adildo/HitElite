import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

var navGroups = [
  {
    label: 'Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: '◼', href: '/admin' },
      { id: 'schedule', label: 'Schedule', icon: '📅', href: '/admin/schedule' },
      { id: 'appointments', label: 'Appointments', icon: '🎾', href: '/admin/appointments' },
      { id: 'classes', label: 'Classes', icon: '👥', href: '/admin/classes' },
      { id: 'waitlist', label: 'Waitlist', icon: '⏳', href: '/admin/waitlist' },
      { id: 'checkin', label: 'QR Check-in', icon: '📱', href: '/admin/checkin' },
    ]
  },
  {
    label: 'People',
    items: [
      { id: 'customers', label: 'Customers', icon: '👤', href: '/admin/customers' },
      { id: 'staff', label: 'Staff & Coaches', icon: '🏆', href: '/admin/staff' },
      { id: 'leads', label: 'Leads', icon: '🎯', href: '/admin/leads' },
    ]
  },
  {
    label: 'Business',
    items: [
      { id: 'payments', label: 'Payments', icon: '💳', href: '/admin/payments' },
      { id: 'bookkeeping', label: 'Bookkeeping', icon: '📒', href: '/admin/bookkeeping' },
      { id: 'analytics', label: 'Analytics', icon: '📊', href: '/admin/analytics' },
      { id: 'marketing', label: 'Marketing', icon: '📣', href: '/admin/marketing' },
      { id: 'reviews', label: 'Reviews', icon: '⭐', href: '/admin/reviews' },
      { id: 'messages', label: 'Messages', icon: '💬', href: '/admin/messages' },
      { id: 'videos', label: 'Video library', icon: '🎬', href: '/admin/videos' },
      { id: 'loyalty', label: 'Loyalty & Referrals', icon: '⭐', href: '/admin/loyalty' },
      { id: 'notifications', label: 'Notifications', icon: '🔔', href: '/admin/notifications' },
    ]
  },
  {
    label: 'Config',
    items: [

      { id: 'locations', label: 'Locations', icon: '📍', href: '/admin/locations' },
      { id: 'courts', label: 'Court costs', icon: '🎾', href: '/admin/courts' },
      { id: 'tags', label: 'Tags', icon: '🏷', href: '/admin/tags' },
      { id: 'tasks', label: 'Tasks', icon: '✅', href: '/admin/tasks' },
      { id: 'drills', label: 'Drill library', icon: '🎾', href: '/admin/drills' },
      { id: 'permissions', label: 'Permissions', icon: '🔐', href: '/admin/permissions' },
      { id: 'plugins', label: 'Website plugins', icon: '🔌', href: '/admin/plugins' },
      { id: 'settings', label: 'Settings', icon: '⚙', href: '/admin/settings' },
    ]
  }
]

export default function AdminLayout({ children, active }) {
  var [profile, setProfile] = useState(null)
  var [authStatus, setAuthStatus] = useState('loading')

  useEffect(function() {
    async function init() {
      var s = await supabase.auth.getSession()
      if (!s.data.session) { window.location.href = '/login'; return }
      var p = await supabase.from('profiles').select('*').eq('id', s.data.session.user.id).single()
      if (!p.data || !['admin','manager','staff'].includes(p.data.role)) {
        window.location.href = '/portal'; return
      }
      setProfile(p.data)
      setAuthStatus('ok')
    }
    init()
  }, [])

  if (authStatus === 'loading') return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff', marginBottom: '10px' }}>HIT <span style={{ color: '#D4A843' }}>ELITE</span></div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>Loading admin...</div>
      </div>
    </div>
  )

  var navItem = function(item) {
    var isActive = active === item.id
    return (
      <a key={item.id} href={item.href} style={{
        display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px',
        borderRadius: '8px', fontSize: '13px', textDecoration: 'none',
        background: isActive ? 'rgba(212,168,67,0.15)' : 'transparent',
        color: isActive ? '#D4A843' : 'rgba(255,255,255,0.6)',
        fontWeight: isActive ? 600 : 400,
        transition: 'all 0.1s',
      }}>
        <span style={{ fontSize: '14px', width: '18px', textAlign: 'center' }}>{item.icon}</span>
        {item.label}
      </a>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f5f5f3' }}>
      {/* Sidebar */}
      <div style={{ width: '220px', background: '#0D0D0D', display: 'flex', flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        <div style={{ padding: '1.25rem 1rem 0.75rem' }}>
          <div style={{ fontSize: '17px', fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
            HIT <span style={{ color: '#D4A843' }}>ELITE</span>
          </div>
          <div style={{ display: 'inline-block', marginTop: '6px', padding: '2px 10px', background: 'rgba(212,168,67,0.15)', borderRadius: '6px', fontSize: '11px', color: '#D4A843', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            {profile && profile.role === 'admin' ? 'Admin' : profile && profile.role === 'manager' ? 'Manager' : 'Staff'}
          </div>
        </div>

        <div style={{ flex: 1, padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {navGroups.map(function(group) {
            return (
              <div key={group.label} style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 10px 4px' }}>{group.label}</div>
                {group.items.map(navItem)}
              </div>
            )
          })}
        </div>

        <div style={{ padding: '0.75rem', borderTop: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', padding: '4px 10px 4px', wordBreak: 'break-all' }}>{profile && profile.email}</div>
          <button onClick={function() { supabase.auth.signOut().then(function() { window.location.href = '/login' }) }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', width: '100%', textAlign: 'left', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '13px', color: 'rgba(255,255,255,0.4)', borderRadius: '8px', fontFamily: 'inherit' }}>
            <span style={{ fontSize: '14px' }}>🚪</span> Sign out
          </button>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}
