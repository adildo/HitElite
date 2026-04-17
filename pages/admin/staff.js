import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Staff() {
  var [staffList, setStaffList] = useState([])
  var [loading, setLoading] = useState(true)
  var [showNew, setShowNew] = useState(false)
  var [activeStaff, setActiveStaff] = useState(null)
  var [form, setForm] = useState({ full_name:'', email:'', phone:'', role:'coach', bio:'', default_pay_rate:'', pay_rate_type:'per_session' })
  var [saving, setSaving] = useState(false)

  useEffect(function() { loadStaff() }, [])

  async function loadStaff() {
    setLoading(true)
    var result = await supabase.from('profiles').select('*, staff(bio, default_pay_rate, pay_rate_type, show_in_directory, is_active, specialties)').in('role', ['coach','staff','manager']).eq('is_active', true).order('full_name')
    setStaffList(result.data || [])
    setLoading(false)
  }

  function setField(key, val) { setForm(function(p){var n={...p};n[key]=val;return n}) }

  async function saveStaff() {
    if (!form.full_name || !form.email) return
    setSaving(true)
    // Create auth user via admin API is not available client-side
    // Instead we create the profile directly (admin would invite via Supabase dashboard)
    var profileId = crypto.randomUUID()
    var profileResult = await supabase.from('profiles').insert({
      id: profileId, email: form.email, full_name: form.full_name,
      phone: form.phone, role: form.role, is_active: true
    })
    if (!profileResult.error) {
      await supabase.from('staff').insert({
        id: profileId, bio: form.bio,
        default_pay_rate: parseFloat(form.default_pay_rate) || 0,
        pay_rate_type: form.pay_rate_type, is_active: true
      })
    }
    setSaving(false)
    setShowNew(false)
    setForm({ full_name:'', email:'', phone:'', role:'coach', bio:'', default_pay_rate:'', pay_rate_type:'per_session' })
    loadStaff()
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var roleBadge = function(role) {
    var s = { admin:['#F5E6C0','#B8922E'], manager:['#EEEDFE','#534AB7'], coach:['#E1F5EE','#0F6E56'], staff:['#F1EFE8','#5F5E5A'] }
    var c = s[role] || s.staff
    return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:c[0], color:c[1], fontWeight:500 }}>{role}</span>
  }

  if (activeStaff) {
    var s = activeStaff
    var staffData = s.staff && s.staff[0] ? s.staff[0] : s.staff || {}
    var initials = (s.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
    return (
      <AdminLayout active="staff">
        <div style={{ padding:'1.5rem 2rem' }}>
          <button onClick={function(){setActiveStaff(null)}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to staff</button>
          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'1.5rem' }}>
            <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:'#0D0D0D', color:'#D4A843', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:700 }}>{initials}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                <div style={{ fontSize:'20px', fontWeight:700 }}>{s.full_name}</div>
                {roleBadge(s.role)}
              </div>
              <div style={{ fontSize:'13px', color:'#888' }}>{s.email}</div>
            </div>
            <button style={btnGold}>Edit profile</button>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Contact & details</div>
              {[['Email',s.email],['Phone',s.phone||'—'],['Pay rate', staffData.default_pay_rate ? '$'+staffData.default_pay_rate+' / '+staffData.pay_rate_type : '—'],['Bio',staffData.bio||'—']].map(function(row,i){
                return <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'13px', gap:'12px' }}><div style={{ color:'#888', width:'80px', flexShrink:0 }}>{row[0]}</div><div style={{ wordBreak:'break-word' }}>{row[1]}</div></div>
              })}
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Performance</div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                {[['Sessions this month','0'],['Total customers','0'],['Payout pending','$0'],['Avg. rating','—']].map(function(m,i){
                  return <div key={i} style={{ background:'#f5f5f3', borderRadius:'8px', padding:'10px' }}><div style={{ fontSize:'11px', color:'#888', marginBottom:'4px' }}>{m[0]}</div><div style={{ fontSize:'18px', fontWeight:700 }}>{m[1]}</div></div>
                })}
              </div>
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Availability</div>
              <div style={{ fontSize:'13px', color:'#888', textAlign:'center', padding:'1rem 0' }}>No availability set. Coach can configure this from their portal.</div>
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Tasks</div>
              <div style={{ fontSize:'13px', color:'#888', textAlign:'center', padding:'1rem 0' }}>No tasks assigned.</div>
              <button style={{ ...btnGold, width:'100%', marginTop:'8px' }}>+ Assign task</button>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout active="staff">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Staff & Coaches</div>
            <div style={{ fontSize:'13px', color:'#888' }}>{staffList.length} active members</div>
          </div>
          <button style={btnGold} onClick={function(){setShowNew(function(x){return !x})}}>+ Add staff</button>
        </div>

        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Add new staff member</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              {[['Full name','text','full_name','Coach Maria'],['Email','email','email','maria@hitelite.com'],['Phone','tel','phone','(555) 000-0000']].map(function(f){
                return <div key={f[2]}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>{f[0]}</div><input type={f[1]} style={inp} placeholder={f[3]} value={form[f[2]]} onChange={function(e){setField(f[2],e.target.value)}} /></div>
              })}
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Role</div>
                <select style={inp} value={form.role} onChange={function(e){setField('role',e.target.value)}}><option value="coach">Coach</option><option value="staff">Staff</option><option value="manager">Manager</option></select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Default pay rate ($)</div><input type="number" style={inp} placeholder="80" value={form.default_pay_rate} onChange={function(e){setField('default_pay_rate',e.target.value)}} /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Pay rate type</div>
                <select style={inp} value={form.pay_rate_type} onChange={function(e){setField('pay_rate_type',e.target.value)}}><option value="per_session">Per session</option><option value="hourly">Hourly</option><option value="percentage">% of revenue</option></select>
              </div>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Bio (shown on public profile)</div><textarea style={{ ...inp, resize:'none', height:'70px' }} placeholder="Coach specialties, experience, coaching style..." value={form.bio} onChange={function(e){setField('bio',e.target.value)}} /></div>
            </div>
            <div style={{ background:'#F5E6C0', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#8B6914', marginBottom:'12px' }}>
              ℹ️ After saving, invite this staff member to log in via Supabase Auth → Users → Invite user, using the same email address.
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveStaff} disabled={saving}>{saving?'Saving...':'Save staff member'}</button>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:'14px' }}>
          {loading && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px', gridColumn:'span 3' }}>Loading staff...</div>}
          {!loading && staffList.length === 0 && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', gridColumn:'span 3' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>🏆</div>
              <div style={{ fontWeight:600, marginBottom:'6px' }}>No staff yet</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1rem' }}>Add your coaches and staff to get started.</div>
              <button style={btnGold} onClick={function(){setShowNew(true)}}>+ Add staff member</button>
            </div>
          )}
          {staffList.map(function(member) {
            var staffData = member.staff && member.staff[0] ? member.staff[0] : {}
            var initials = (member.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
            var payRate = staffData.default_pay_rate ? '$'+parseFloat(staffData.default_pay_rate).toFixed(0)+'/'+staffData.pay_rate_type : '—'
            return (
              <div key={member.id} onClick={function(){setActiveStaff(member)}} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', cursor:'pointer', transition:'border-color 0.1s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'#0D0D0D', color:'#D4A843', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:700, flexShrink:0 }}>{initials}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'3px' }}>{member.full_name}</div>
                    {roleBadge(member.role)}
                  </div>
                </div>
                <div style={{ fontSize:'12px', color:'#888', display:'grid', gap:'4px' }}>
                  <div>✉ {member.email}</div>
                  {member.phone && <div>📱 {member.phone}</div>}
                  <div>💳 {payRate}</div>
                  {staffData.bio && <div style={{ marginTop:'4px', fontSize:'12px', color:'#666', overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{staffData.bio}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
