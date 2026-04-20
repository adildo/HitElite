import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var PERMISSION_GROUPS = [
  { group: 'Classes', color: '#D4A843', perms: [
    { key: 'classes.view_all', label: 'View all classes' },
    { key: 'classes.view_own', label: 'View own classes only' },
    { key: 'classes.create', label: 'Create classes' },
    { key: 'classes.edit', label: 'Edit classes' },
    { key: 'classes.delete', label: 'Delete classes' },
    { key: 'classes.manage_waitlist', label: 'Manage waitlists' },
    { key: 'classes.checkin', label: 'Check in customers' },
  ]},
  { group: 'Appointments', color: '#534AB7', perms: [
    { key: 'appts.view_all', label: 'View all appointments' },
    { key: 'appts.view_own', label: 'View own appointments only' },
    { key: 'appts.approve', label: 'Approve / decline requests' },
    { key: 'appts.manage_waitlist', label: 'Manage waitlists' },
  ]},
  { group: 'Customers', color: '#185FA5', perms: [
    { key: 'customers.view_all', label: 'View all customers' },
    { key: 'customers.view_own', label: 'View own customers only' },
    { key: 'customers.edit', label: 'Edit customer profiles' },
    { key: 'customers.view_payments', label: 'View customer payment history' },
    { key: 'customers.tags', label: 'Add / remove tags' },
    { key: 'customers.export', label: 'Export customer data' },
  ]},
  { group: 'Financials', color: '#1D9E75', perms: [
    { key: 'financials.own_payouts', label: 'View own payout reports' },
    { key: 'financials.all_payouts', label: 'View all payouts' },
    { key: 'financials.revenue', label: 'View total revenue' },
    { key: 'financials.bookkeeping', label: 'Access bookkeeping module' },
    { key: 'financials.refunds', label: 'Process refunds' },
  ]},
  { group: 'Marketing', color: '#D85A30', perms: [
    { key: 'marketing.view', label: 'View campaigns' },
    { key: 'marketing.create', label: 'Create campaigns' },
    { key: 'marketing.send', label: 'Send messages' },
    { key: 'marketing.leads', label: 'Manage leads' },
    { key: 'marketing.analytics', label: 'View marketing analytics' },
  ]},
  { group: 'Staff', color: '#8B6914', perms: [
    { key: 'staff.view', label: 'View staff list' },
    { key: 'staff.edit_own', label: 'Edit own profile' },
    { key: 'staff.view_pay_rates', label: 'View other staff pay rates' },
    { key: 'staff.manage_roles', label: 'Manage roles' },
  ]},
  { group: 'Analytics', color: '#534AB7', perms: [
    { key: 'analytics.business', label: 'View business-wide analytics' },
    { key: 'analytics.own', label: 'View own performance stats only' },
  ]},
  { group: 'Settings', color: '#444', perms: [
    { key: 'settings.business', label: 'Edit business settings' },
    { key: 'settings.integrations', label: 'Manage integrations' },
    { key: 'settings.locations', label: 'Manage locations' },
    { key: 'settings.waivers', label: 'Manage terms & waivers' },
  ]},
]

var ROLE_PRESETS = {
  admin: 'all',
  manager: ['classes.view_all','classes.create','classes.edit','classes.manage_waitlist','classes.checkin','appts.view_all','appts.approve','appts.manage_waitlist','customers.view_all','customers.edit','customers.tags','customers.export','financials.all_payouts','financials.revenue','marketing.view','marketing.create','marketing.send','marketing.leads','marketing.analytics','staff.view','staff.edit_own','analytics.business','settings.locations'],
  coach: ['classes.view_own','classes.checkin','appts.view_own','customers.view_own','financials.own_payouts','analytics.own','staff.edit_own'],
  staff: ['classes.view_all','classes.checkin','appts.view_all','appts.approve','appts.manage_waitlist','customers.view_all','customers.edit','customers.tags','staff.view','staff.edit_own'],
}

export default function Permissions() {
  var [staffList, setStaffList] = useState([])
  var [loading, setLoading] = useState(true)
  var [selected, setSelected] = useState(null)
  var [perms, setPerms] = useState({})
  var [saving, setSaving] = useState(false)
  var [saved, setSaved] = useState(false)
  var [search, setSearch] = useState('')

  useEffect(function(){ loadStaff() }, [])

  async function loadStaff() {
    setLoading(true)
    var r = await supabase.from('profiles').select('id, full_name, email, role').in('role',['coach','staff','manager']).eq('is_active',true).order('full_name')
    setStaffList(r.data||[])
    setLoading(false)
  }

  async function selectStaff(member) {
    setSelected(member)
    setSaved(false)
    // Load existing permissions
    var r = await supabase.from('staff_permissions').select('permissions_json').eq('staff_id', member.id).maybeSingle()
    if (r.data && r.data.permissions_json) {
      setPerms(r.data.permissions_json)
    } else {
      // Apply role preset
      applyPreset(member.role)
    }
  }

  function applyPreset(role) {
    var preset = ROLE_PRESETS[role]
    var newPerms = {}
    if (preset === 'all') {
      PERMISSION_GROUPS.forEach(function(g){ g.perms.forEach(function(p){ newPerms[p.key] = true }) })
    } else if (preset) {
      PERMISSION_GROUPS.forEach(function(g){ g.perms.forEach(function(p){ newPerms[p.key] = preset.includes(p.key) }) })
    }
    setPerms(newPerms)
  }

  function toggle(key) {
    setPerms(function(p){ var n={...p}; n[key]=!n[key]; return n })
  }

  function toggleGroup(group, value) {
    setPerms(function(p){
      var n={...p}
      group.perms.forEach(function(perm){ n[perm.key] = value })
      return n
    })
  }

  async function savePerms() {
    if (!selected) return
    setSaving(true)
    var existing = await supabase.from('staff_permissions').select('id').eq('staff_id', selected.id).maybeSingle()
    if (existing.data) {
      await supabase.from('staff_permissions').update({ permissions_json: perms }).eq('staff_id', selected.id)
    } else {
      await supabase.from('staff_permissions').insert({ staff_id: selected.id, permissions_json: perms })
    }
    setSaving(false); setSaved(true)
    setTimeout(function(){ setSaved(false) }, 2500)
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  var roleBadgeColor = { admin:['#F5E6C0','#B8922E'], manager:['#EEEDFE','#534AB7'], coach:['#E1F5EE','#0F6E56'], staff:['#F1EFE8','#5F5E5A'] }
  var filteredStaff = staffList.filter(function(s){ return !search || s.full_name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase()) })

  var allPermsCount = PERMISSION_GROUPS.reduce(function(s,g){ return s+g.perms.length },0)
  var enabledCount = Object.values(perms).filter(Boolean).length

  return (
    <AdminLayout active="staff">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'4px' }}>Permissions</div>
        <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Configure granular access controls per staff member</div>

        <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:'16px', alignItems:'start' }}>
          {/* Staff list */}
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'10px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>
              <input type="text" style={{ ...inp }} placeholder="Search staff..." value={search} onChange={function(e){setSearch(e.target.value)}} />
            </div>
            {loading && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
            {filteredStaff.map(function(member){
              var ini = (member.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
              var rc = roleBadgeColor[member.role]||roleBadgeColor.staff
              var isSelected = selected && selected.id === member.id
              return (
                <div key={member.id} onClick={function(){selectStaff(member)}} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 14px', cursor:'pointer', background:isSelected?'#FFFBF0':'transparent', borderBottom:'0.5px solid rgba(0,0,0,0.04)', borderLeft:isSelected?'3px solid #D4A843':'3px solid transparent' }}>
                  <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'#0D0D0D', color:'#D4A843', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, flexShrink:0 }}>{ini}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'13px', fontWeight:isSelected?600:400, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{member.full_name}</div>
                    <span style={{ display:'inline-block', padding:'1px 7px', borderRadius:'5px', fontSize:'10px', background:rc[0], color:rc[1], fontWeight:500 }}>{member.role}</span>
                  </div>
                </div>
              )
            })}
            {!loading && filteredStaff.length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No staff found.</div>}
          </div>

          {/* Permission editor */}
          {!selected ? (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>
              <div style={{ fontSize:'28px', marginBottom:'14px' }}>🔐</div>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'8px', color:'#1a1a1a' }}>Select a staff member</div>
              <div style={{ fontSize:'13px' }}>Choose a coach or staff member on the left to configure their permissions.</div>
            </div>
          ) : (
            <div>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                <div>
                  <div style={{ fontSize:'16px', fontWeight:600 }}>{selected.full_name}</div>
                  <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{enabledCount} of {allPermsCount} permissions enabled</div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <div style={{ display:'flex', gap:'4px' }}>
                    {Object.keys(ROLE_PRESETS).map(function(role){
                      if (role === 'admin') return null
                      return <button key={role} style={{ ...btn, fontSize:'12px', padding:'5px 10px' }} onClick={function(){applyPreset(role)}}>
                        Apply {role} preset
                      </button>
                    })}
                  </div>
                  {saved ? (
                    <div style={{ padding:'7px 14px', borderRadius:'8px', background:'#E1F5EE', color:'#0F6E56', fontSize:'13px', fontWeight:600 }}>✓ Saved!</div>
                  ) : (
                    <button style={btnGold} onClick={savePerms} disabled={saving}>{saving?'Saving...':'Save permissions'}</button>
                  )}
                </div>
              </div>

              {/* Permission groups */}
              <div style={{ display:'grid', gap:'12px' }}>
                {PERMISSION_GROUPS.map(function(group){
                  var groupEnabled = group.perms.filter(function(p){ return perms[p.key] }).length
                  var allOn = groupEnabled === group.perms.length
                  var someOn = groupEnabled > 0 && !allOn
                  return (
                    <div key={group.group} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                      <div style={{ padding:'10px 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:'10px', background:'#f9f9f7' }}>
                        <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:group.color, flexShrink:0 }}></div>
                        <div style={{ fontSize:'13px', fontWeight:600, flex:1 }}>{group.group}</div>
                        <div style={{ fontSize:'11px', color:'#888' }}>{groupEnabled}/{group.perms.length}</div>
                        <div style={{ display:'flex', gap:'6px' }}>
                          <button style={{ ...btn, fontSize:'11px', padding:'3px 8px', color:'#1D9E75', borderColor:'#5DCAA5' }} onClick={function(){toggleGroup(group,true)}}>All on</button>
                          <button style={{ ...btn, fontSize:'11px', padding:'3px 8px', color:'#A32D2D', borderColor:'#F09595' }} onClick={function(){toggleGroup(group,false)}}>All off</button>
                        </div>
                      </div>
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0 }}>
                        {group.perms.map(function(perm, i){
                          var on = !!perms[perm.key]
                          return (
                            <div key={perm.key} onClick={function(){toggle(perm.key)}} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 1.25rem', cursor:'pointer', borderBottom:i<group.perms.length-2?'0.5px solid rgba(0,0,0,0.04)':'none', borderRight:i%2===0?'0.5px solid rgba(0,0,0,0.04)':'none', background:on?'rgba(212,168,67,0.03)':'transparent' }}>
                              <div style={{ width:'32px', height:'18px', borderRadius:'9px', background:on?group.color:'rgba(0,0,0,0.12)', position:'relative', flexShrink:0, transition:'background .15s', cursor:'pointer' }}>
                                <div style={{ position:'absolute', width:'14px', height:'14px', borderRadius:'50%', background:'#fff', top:'2px', right:on?'2px':'16px', transition:'right .15s', boxShadow:'0 1px 2px rgba(0,0,0,0.15)' }}></div>
                              </div>
                              <span style={{ fontSize:'12px', color:on?'#1a1a1a':'#999', fontWeight:on?500:400 }}>{perm.label}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
