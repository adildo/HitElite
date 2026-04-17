import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: '28px', fontWeight: 800, color: color || '#1a1a1a', marginBottom: '4px' }}>{value}</div>
      {sub && <div style={{ fontSize: '12px', color: '#999' }}>{sub}</div>}
    </div>
  )
}

export default function AdminDashboard() {
  var [stats, setStats] = useState({ customers: 0, todaySessions: 0, pendingRequests: 0, waitlist: 0, monthRevenue: 0 })
  var [recentAppointments, setRecentAppointments] = useState([])
  var [upcomingClasses, setUpcomingClasses] = useState([])
  var [loading, setLoading] = useState(true)

  useEffect(function() {
    async function load() {
      var [custR, apptR, classR] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'customer').eq('is_active', true),
        supabase.from('appointments').select('id, starts_at, status, total_amount, profiles!appointments_customer_id_fkey(full_name), services(name)').order('starts_at', { ascending: false }).limit(8),
        supabase.from('class_sessions').select('id, starts_at, ends_at, enrolled_count, classes(name, color, capacity)').gte('starts_at', new Date().toISOString()).order('starts_at').limit(6),
      ])
      var today = new Date().toISOString().split('T')[0]
      var todayAppts = await supabase.from('appointments').select('id', { count: 'exact' }).gte('starts_at', today).lt('starts_at', today + 'T23:59:59')
      var pending = await supabase.from('appointments').select('id', { count: 'exact' }).eq('status', 'pending')
      var monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0,0,0,0)
      var revenue = await supabase.from('appointments').select('amount_paid').gte('starts_at', monthStart.toISOString())
      var totalRev = (revenue.data || []).reduce(function(sum, a) { return sum + (parseFloat(a.amount_paid) || 0) }, 0)
      setStats({
        customers: custR.count || 0,
        todaySessions: todayAppts.count || 0,
        pendingRequests: pending.count || 0,
        monthRevenue: totalRev,
      })
      setRecentAppointments(apptR.data || [])
      setUpcomingClasses(classR.data || [])
      setLoading(false)
    }
    load()
  }, [])

  var statusBadge = function(status) {
    var styles = { pending: ['#FAEEDA','#854F0B'], confirmed: ['#E1F5EE','#0F6E56'], completed: ['#F1EFE8','#5F5E5A'], cancelled: ['#FCEBEB','#A32D2D'] }
    var s = styles[status] || styles.pending
    return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', background: s[0], color: s[1], fontWeight: 500 }}>{status}</span>
  }

  return (
    <AdminLayout active="dashboard">
      <div style={{ padding: '1.5rem 2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Dashboard</div>
          <div style={{ fontSize: '13px', color: '#888' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '14px', marginBottom: '1.5rem' }}>
          <StatCard label="Total customers" value={stats.customers} color="#185FA5" />
          <StatCard label="Sessions today" value={stats.todaySessions} color="#D4A843" />
          <StatCard label="Pending requests" value={stats.pendingRequests} color="#BA7517" />
          <StatCard label="Revenue this month" value={'$' + stats.monthRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} color="#1D9E75" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* Recent Appointments */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Recent appointments</div>
              <a href="/admin/appointments" style={{ fontSize: '12px', color: '#D4A843', fontWeight: 600 }}>View all →</a>
            </div>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>Loading...</div>
            ) : recentAppointments.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>No appointments yet</div>
            ) : recentAppointments.map(function(a, i) {
              var customer = a.profiles ? a.profiles.full_name : 'Unknown'
              var service = a.services ? a.services.name : 'Service'
              var date = new Date(a.starts_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              var time = new Date(a.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              return (
                <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 1.25rem', borderBottom: i < recentAppointments.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#F5E6C0', color: '#B8922E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                    {customer.split(' ').map(function(n) { return n[0] }).join('').substring(0,2)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer}</div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{service} · {date} {time}</div>
                  </div>
                  {statusBadge(a.status)}
                </div>
              )
            })}
          </div>

          {/* Upcoming Classes */}
          <div style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>Upcoming classes</div>
              <a href="/admin/classes" style={{ fontSize: '12px', color: '#D4A843', fontWeight: 600 }}>Manage →</a>
            </div>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>Loading...</div>
            ) : upcomingClasses.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#999', fontSize: '13px' }}>No upcoming sessions<br /><a href="/admin/classes" style={{ color: '#D4A843', fontSize: '13px', marginTop: '6px', display: 'inline-block' }}>+ Create a class</a></div>
            ) : upcomingClasses.map(function(s, i) {
              var cls = s.classes || {}
              var date = new Date(s.starts_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              var time = new Date(s.starts_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
              var pct = cls.capacity ? Math.round((s.enrolled_count / cls.capacity) * 100) : 0
              return (
                <div key={s.id} style={{ padding: '10px 1.25rem', borderBottom: i < upcomingClasses.length - 1 ? '0.5px solid rgba(0,0,0,0.05)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: cls.color || '#D4A843', flexShrink: 0 }}></div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{cls.name}</div>
                    </div>
                    <div style={{ fontSize: '11px', color: '#888' }}>{s.enrolled_count}/{cls.capacity}</div>
                  </div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>{date} · {time}</div>
                  <div style={{ height: '4px', background: '#f1efe8', borderRadius: '2px' }}>
                    <div style={{ height: '100%', borderRadius: '2px', background: pct >= 90 ? '#A32D2D' : pct >= 70 ? '#D4A843' : '#1D9E75', width: pct + '%', transition: 'width 0.3s' }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div style={{ marginTop: '16px', display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '12px' }}>
          {[
            { label: 'New appointment', icon: '🎾', href: '/admin/appointments/new' },
            { label: 'Add customer', icon: '👤', href: '/admin/customers/new' },
            { label: 'Create class', icon: '👥', href: '/admin/classes/new' },
            { label: 'Add staff', icon: '🏆', href: '/admin/staff/new' },
          ].map(function(action, i) {
            return (
              <a key={i} href={action.href} style={{ background: '#fff', border: '0.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '1rem', textAlign: 'center', textDecoration: 'none', color: '#1a1a1a', display: 'block', transition: 'border-color 0.1s' }}>
                <div style={{ fontSize: '22px', marginBottom: '6px' }}>{action.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#444' }}>{action.label}</div>
              </a>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
