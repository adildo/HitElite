import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

function Badge({ label, bg, color }) {
  return <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:bg, color:color, fontWeight:500 }}>{label}</span>
}

function Toggle({ on, onToggle, label, sub }) {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0' }}>
      <div>
        <div style={{ fontSize:'13px', fontWeight:500 }}>{label}</div>
        {sub && <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>{sub}</div>}
      </div>
      <div onClick={onToggle} style={{ width:'38px', height:'21px', borderRadius:'11px', background:on?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
        <div style={{ position:'absolute', width:'17px', height:'17px', borderRadius:'50%', background:'#fff', top:'2px', right:on?'2px':'19px', transition:'right .15s' }}></div>
      </div>
    </div>
  )
}

export default function Staff() {
  var [staffList, setStaffList] = useState([])
  var [loading, setLoading] = useState(true)
  var [activeStaff, setActiveStaff] = useState(null)
  var [activeTab, setActiveTab] = useState('profile')
  var [showNew, setShowNew] = useState(false)
  var [saving, setSaving] = useState(false)
  var [form, setForm] = useState({ full_name:'', email:'', phone:'', role:'coach', bio:'', default_pay_rate:'80', pay_rate_type:'per_session' })
  // Pay rate rule form
  var [payRules, setPayRules] = useState([])
  var [showNewRule, setShowNewRule] = useState(false)
  var [ruleForm, setRuleForm] = useState({ name:'', base_rate:'', rate_type:'per_session', min_pay:'', max_pay:'', per_customer:false, percentage_split:false, percentage_value:'', count_checkins_only:false, include_late_cancels:false })
  // Stats
  var [staffStats, setStaffStats] = useState(null)
  var [statsLoading, setStatsLoading] = useState(false)

  useEffect(function(){ loadStaff() }, [])

  async function loadStaff() {
    setLoading(true)
    var r = await supabase.from('profiles').select('*, staff(bio, default_pay_rate, pay_rate_type, show_in_directory, is_active, specialties, availability_json)').in('role',['coach','staff','manager']).eq('is_active',true).order('full_name')
    setStaffList(r.data||[])
    setLoading(false)
  }

  async function openStaff(member) {
    setActiveStaff(member)
    setActiveTab('profile')
    loadPayRules(member.id)
    loadStats(member.id)
  }

  async function loadPayRules(staffId) {
    var r = await supabase.from('pay_rates').select('*').eq('staff_id', staffId).order('created_at')
    setPayRules(r.data||[])
  }

  async function loadStats(staffId) {
    setStatsLoading(true)
    var now = new Date()
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    var [apptR, payoutR] = await Promise.all([
      supabase.from('appointments').select('id, starts_at, total_amount, amount_paid, status, profiles!appointments_customer_id_fkey(id, full_name)').eq('coach_id', staffId).order('starts_at', { ascending: false }).limit(20),
      supabase.from('payout_records').select('*').eq('staff_id', staffId).order('period_end', { ascending: false }).limit(6),
    ])
    var appts = apptR.data || []
    var completed = appts.filter(function(a){ return a.status === 'completed' || a.status === 'confirmed' })
    var monthAppts = appts.filter(function(a){ return new Date(a.starts_at) >= monthStart })
    var totalRev = completed.reduce(function(s,a){ return s + (parseFloat(a.amount_paid)||0) }, 0)
    var monthRev = monthAppts.filter(function(a){ return a.status==='confirmed'||a.status==='completed' }).reduce(function(s,a){ return s + (parseFloat(a.amount_paid)||0) }, 0)
    var uniqueCusts = new Set(completed.map(function(a){ return a.profiles&&a.profiles.id })).size
    setStaffStats({ appts, payouts: payoutR.data||[], totalRevenue: totalRev, monthRevenue: monthRev, totalSessions: completed.length, monthSessions: monthAppts.length, uniqueCustomers: uniqueCusts })
    setStatsLoading(false)
  }

  async function saveStaff() {
    setSaving(true)
    var profileId = crypto.randomUUID()
    var profileResult = await supabase.from('profiles').insert({ id:profileId, email:form.email, full_name:form.full_name, phone:form.phone, role:form.role, is_active:true })
    if (!profileResult.error) {
      await supabase.from('staff').insert({ id:profileId, bio:form.bio, default_pay_rate:parseFloat(form.default_pay_rate)||0, pay_rate_type:form.pay_rate_type, is_active:true })
    }
    setSaving(false); setShowNew(false)
    setForm({ full_name:'', email:'', phone:'', role:'coach', bio:'', default_pay_rate:'80', pay_rate_type:'per_session' })
    loadStaff()
  }

  async function savePayRule() {
    if (!ruleForm.name || !activeStaff) return
    setSaving(true)
    await supabase.from('pay_rates').insert({
      staff_id: activeStaff.id, name: ruleForm.name,
      rules_json: {
        base_rate: parseFloat(ruleForm.base_rate)||0,
        rate_type: ruleForm.rate_type,
        min_pay: parseFloat(ruleForm.min_pay)||null,
        max_pay: parseFloat(ruleForm.max_pay)||null,
        per_customer: ruleForm.per_customer,
        percentage_split: ruleForm.percentage_split,
        percentage_value: parseFloat(ruleForm.percentage_value)||null,
        count_checkins_only: ruleForm.count_checkins_only,
        include_late_cancels: ruleForm.include_late_cancels,
      }
    })
    setSaving(false); setShowNewRule(false)
    setRuleForm({ name:'', base_rate:'', rate_type:'per_session', min_pay:'', max_pay:'', per_customer:false, percentage_split:false, percentage_value:'', count_checkins_only:false, include_late_cancels:false })
    loadPayRules(activeStaff.id)
  }

  async function deletePayRule(id) {
    await supabase.from('pay_rates').delete().eq('id', id)
    loadPayRules(activeStaff.id)
  }

  function setRuleField(k, v) { setRuleForm(function(p){ var n={...p}; n[k]=v; return n }) }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', fontFamily:'inherit' }

  function tabStyle(t) {
    return { padding:'8px 16px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:activeTab===t?'2px solid #D4A843':'2px solid transparent', color:activeTab===t?'#D4A843':'#888', fontWeight:activeTab===t?600:400, marginBottom:'-1px', whiteSpace:'nowrap' }
  }

  function roleBadge(role) {
    var s = { admin:['#F5E6C0','#B8922E'], manager:['#EEEDFE','#534AB7'], coach:['#E1F5EE','#0F6E56'], staff:['#F1EFE8','#5F5E5A'] }
    var c = s[role]||s.staff
    return <Badge label={role} bg={c[0]} color={c[1]} />
  }

  // ── STAFF DETAIL ──
  if (activeStaff) {
    var s = activeStaff
    var staffData = s.staff && s.staff[0] ? s.staff[0] : s.staff || {}
    var initials = (s.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)

    return (
      <AdminLayout active="staff">
        <div style={{ padding:'1.5rem 2rem' }}>
          <button onClick={function(){setActiveStaff(null);setStaffStats(null)}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to staff</button>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'1.25rem' }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'#0D0D0D', color:'#D4A843', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'20px', fontWeight:700 }}>{initials}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                <div style={{ fontSize:'20px', fontWeight:700 }}>{s.full_name}</div>
                {roleBadge(s.role)}
              </div>
              <div style={{ fontSize:'13px', color:'#888' }}>{s.email}</div>
            </div>
            <button style={btnGold}>Edit profile</button>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
            {[['profile','Profile'],['stats','Performance'],['payrates','Pay rates'],['tasks','Tasks']].map(function(t){
              return <button key={t[0]} style={tabStyle(t[0])} onClick={function(){setActiveTab(t[0])}}>{t[1]}</button>
            })}
          </div>

          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Contact details</div>
                {[['Email',s.email],['Phone',s.phone||'—'],['Pay rate', staffData.default_pay_rate?'$'+parseFloat(staffData.default_pay_rate).toFixed(0)+' / '+staffData.pay_rate_type:'—'],['Bio',staffData.bio||'—']].map(function(row,i){
                  return <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'13px', gap:'12px' }}>
                    <div style={{ color:'#888', width:'80px', flexShrink:0 }}>{row[0]}</div>
                    <div style={{ wordBreak:'break-word' }}>{row[1]}</div>
                  </div>
                })}
              </div>
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Quick stats</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
                  {[['Sessions this month',staffStats?staffStats.monthSessions:'…'],['Total sessions',staffStats?staffStats.totalSessions:'…'],['Revenue this month','$'+(staffStats?staffStats.monthRevenue.toFixed(0):'…')],['Unique students',staffStats?staffStats.uniqueCustomers:'…']].map(function(m,i){
                    return <div key={i} style={{ background:'#f5f5f3', borderRadius:'8px', padding:'10px' }}>
                      <div style={{ fontSize:'11px', color:'#888', marginBottom:'4px' }}>{m[0]}</div>
                      <div style={{ fontSize:'18px', fontWeight:700 }}>{m[1]}</div>
                    </div>
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── STATS TAB ── */}
          {activeTab === 'stats' && (
            <div>
              {statsLoading && <div style={{ textAlign:'center', color:'#999', fontSize:'13px', padding:'2rem' }}>Loading stats...</div>}
              {!statsLoading && staffStats && (
                <div>
                  {/* KPI row */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px', marginBottom:'1.5rem' }}>
                    {[
                      ['Total revenue generated', '$'+staffStats.totalRevenue.toFixed(0), '#1D9E75'],
                      ['Revenue this month', '$'+staffStats.monthRevenue.toFixed(0), '#D4A843'],
                      ['Total sessions', staffStats.totalSessions, '#185FA5'],
                      ['Unique students', staffStats.uniqueCustomers, '#534AB7'],
                    ].map(function(m,i){
                      return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                        <div style={{ fontSize:'11px', color:'#888', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{m[0]}</div>
                        <div style={{ fontSize:'26px', fontWeight:800, color:m[2] }}>{m[1]}</div>
                      </div>
                    })}
                  </div>

                  {/* Recent sessions */}
                  <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden', marginBottom:'1.25rem' }}>
                    <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'14px', fontWeight:600 }}>Recent appointments</div>
                    {staffStats.appts.length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No appointments yet.</div>}
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                      <tbody>
                        {staffStats.appts.slice(0,10).map(function(a,i){
                          var cust = a.profiles ? a.profiles.full_name : '—'
                          var date = new Date(a.starts_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
                          var sc = { pending:['#FAEEDA','#854F0B'], confirmed:['#E1F5EE','#0F6E56'], completed:['#E1F5EE','#0F6E56'], cancelled:['#FCEBEB','#A32D2D'] }[a.status]||['#FAEEDA','#854F0B']
                          return <tr key={a.id} style={{ borderBottom:i<9?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                            <td style={{ padding:'10px 14px', fontWeight:500 }}>{cust}</td>
                            <td style={{ padding:'10px 14px', color:'#888' }}>{date}</td>
                            <td style={{ padding:'10px 14px' }}><Badge label={a.status} bg={sc[0]} color={sc[1]} /></td>
                            <td style={{ padding:'10px 14px', fontWeight:600, color:'#1D9E75' }}>${parseFloat(a.amount_paid||0).toFixed(2)}</td>
                          </tr>
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Payouts */}
                  <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                    <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'14px', fontWeight:600 }}>Payout history</div>
                    {staffStats.payouts.length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No payout records yet. Generate from <a href="/admin/payments" style={{ color:'#D4A843' }}>Payments → Coach payouts</a>.</div>}
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                      <tbody>
                        {staffStats.payouts.map(function(po,i){
                          var sc = po.status==='paid'?['#E1F5EE','#0F6E56']:['#FAEEDA','#854F0B']
                          return <tr key={po.id} style={{ borderBottom:i<staffStats.payouts.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                            <td style={{ padding:'10px 14px', color:'#666', fontSize:'12px' }}>{po.period_start} – {po.period_end}</td>
                            <td style={{ padding:'10px 14px' }}>{po.sessions_count} sessions</td>
                            <td style={{ padding:'10px 14px', fontWeight:700, color:'#1D9E75' }}>${parseFloat(po.total_payout||0).toFixed(2)}</td>
                            <td style={{ padding:'10px 14px' }}><Badge label={po.status} bg={sc[0]} color={sc[1]} /></td>
                          </tr>
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PAY RATES TAB ── */}
          {activeTab === 'payrates' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
                <div>
                  <div style={{ fontSize:'15px', fontWeight:600 }}>Pay rate rules</div>
                  <div style={{ fontSize:'13px', color:'#888', marginTop:'2px' }}>Configure how {s.full_name.split(' ')[0]} is compensated per session</div>
                </div>
                <button style={btnGold} onClick={function(){setShowNewRule(function(x){return !x})}}>+ Add rule</button>
              </div>

              {/* Default rate card */}
              <div style={{ background:'#F5E6C0', border:'0.5px solid #D4A843', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#8B6914', marginBottom:'1.25rem', display:'flex', alignItems:'center', gap:'10px' }}>
                <div style={{ fontSize:'18px' }}>💰</div>
                <div>Default rate: <strong>${parseFloat(staffData.default_pay_rate||0).toFixed(0)} per {staffData.pay_rate_type||'session'}</strong>. Custom rules below override this per service.</div>
              </div>

              {showNewRule && (
                <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
                  <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>New pay rate rule</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'1rem' }}>
                    <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Rule name</div><input type="text" style={inp} value={ruleForm.name} onChange={function(e){setRuleField('name',e.target.value)}} placeholder="e.g. Peak Season Tennis Rate" /></div>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Base rate ($)</div><input type="number" style={inp} value={ruleForm.base_rate} onChange={function(e){setRuleField('base_rate',e.target.value)}} placeholder="80" /></div>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Rate type</div>
                      <select style={sel} value={ruleForm.rate_type} onChange={function(e){setRuleField('rate_type',e.target.value)}}>
                        <option value="per_session">Per session</option>
                        <option value="hourly">Hourly</option>
                        <option value="percentage">% of revenue</option>
                      </select>
                    </div>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Minimum pay ($)</div><input type="number" style={inp} value={ruleForm.min_pay} onChange={function(e){setRuleField('min_pay',e.target.value)}} placeholder="Leave blank for none" /></div>
                    <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Maximum pay cap ($)</div><input type="number" style={inp} value={ruleForm.max_pay} onChange={function(e){setRuleField('max_pay',e.target.value)}} placeholder="Leave blank for none" /></div>
                    {ruleForm.rate_type === 'percentage' && (
                      <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Percentage (%)</div><input type="number" style={inp} value={ruleForm.percentage_value} onChange={function(e){setRuleField('percentage_value',e.target.value)}} placeholder="e.g. 60" /></div>
                    )}
                  </div>
                  <div style={{ borderTop:'0.5px solid rgba(0,0,0,0.08)', paddingTop:'1rem', marginBottom:'1rem' }}>
                    <Toggle on={ruleForm.per_customer} onToggle={function(){setRuleField('per_customer',!ruleForm.per_customer)}} label="Per-customer mode" sub="Pay calculated per attending customer (for group sessions)" />
                    <Toggle on={ruleForm.count_checkins_only} onToggle={function(){setRuleField('count_checkins_only',!ruleForm.count_checkins_only)}} label="Count checked-in customers only" sub="Excludes no-shows from pay calculation" />
                    <Toggle on={ruleForm.include_late_cancels} onToggle={function(){setRuleField('include_late_cancels',!ruleForm.include_late_cancels)}} label="Include late cancellations in count" sub="Late cancels still count toward attendance for pay purposes" />
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button style={btn} onClick={function(){setShowNewRule(false)}}>Cancel</button>
                    <button style={btnGold} onClick={savePayRule} disabled={saving||!ruleForm.name}>{saving?'Saving...':'Save rule'}</button>
                  </div>
                </div>
              )}

              {payRules.length === 0 && !showNewRule && (
                <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888', fontSize:'13px' }}>
                  No custom rules yet. The default rate applies to all sessions. Add a rule to override for specific situations.
                </div>
              )}

              <div style={{ display:'grid', gap:'10px' }}>
                {payRules.map(function(rule){
                  var r = rule.rules_json || {}
                  return (
                    <div key={rule.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', gap:'14px', alignItems:'flex-start' }}>
                      <div style={{ fontSize:'20px' }}>💰</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'6px' }}>{rule.name}</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:'8px', fontSize:'12px' }}>
                          <span style={{ background:'#F5E6C0', color:'#8B6914', padding:'2px 8px', borderRadius:'6px', fontWeight:500 }}>${r.base_rate} / {r.rate_type}</span>
                          {r.min_pay && <span style={{ background:'#E6F1FB', color:'#185FA5', padding:'2px 8px', borderRadius:'6px' }}>Min ${r.min_pay}</span>}
                          {r.max_pay && <span style={{ background:'#EEEDFE', color:'#534AB7', padding:'2px 8px', borderRadius:'6px' }}>Max ${r.max_pay}</span>}
                          {r.per_customer && <span style={{ background:'#E1F5EE', color:'#0F6E56', padding:'2px 8px', borderRadius:'6px' }}>Per customer</span>}
                          {r.count_checkins_only && <span style={{ background:'#f1f1f1', color:'#666', padding:'2px 8px', borderRadius:'6px' }}>Checked-in only</span>}
                        </div>
                      </div>
                      <button style={{ ...btn, fontSize:'12px', padding:'4px 10px', color:'#A32D2D' }} onClick={function(){deletePayRule(rule.id)}}>Delete</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── TASKS TAB ── */}
          {activeTab === 'tasks' && (
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
                <div style={{ fontSize:'14px', fontWeight:600 }}>Assigned tasks</div>
                <a href="/admin/tasks" style={{ fontSize:'12px', color:'#D4A843', fontWeight:600 }}>Manage all tasks →</a>
              </div>
              <div style={{ textAlign:'center', color:'#999', fontSize:'13px', padding:'1.5rem' }}>
                Tasks assigned to {s.full_name.split(' ')[0]} appear here. <a href="/admin/tasks" style={{ color:'#D4A843' }}>Go to Tasks to assign one.</a>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    )
  }

  // ── STAFF LIST ──
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
                return <div key={f[2]}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>{f[0]}</div><input type={f[1]} style={inp} placeholder={f[3]} value={form[f[2]]} onChange={function(e){setForm(function(p){var n={...p};n[f[2]]=e.target.value;return n})}} /></div>
              })}
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Role</div>
                <select style={sel} value={form.role} onChange={function(e){setForm(function(p){return{...p,role:e.target.value}})}}><option value="coach">Coach</option><option value="staff">Staff</option><option value="manager">Manager</option></select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Default pay rate ($)</div><input type="number" style={inp} placeholder="80" value={form.default_pay_rate} onChange={function(e){setForm(function(p){return{...p,default_pay_rate:e.target.value}})}} /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Pay rate type</div>
                <select style={sel} value={form.pay_rate_type} onChange={function(e){setForm(function(p){return{...p,pay_rate_type:e.target.value}})}}><option value="per_session">Per session</option><option value="hourly">Hourly</option><option value="percentage">% of revenue</option></select>
              </div>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Bio</div><textarea style={{ ...inp, resize:'none', height:'70px' }} placeholder="Coach specialties, experience..." value={form.bio} onChange={function(e){setForm(function(p){return{...p,bio:e.target.value}})}} /></div>
            </div>
            <div style={{ background:'#F5E6C0', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#8B6914', marginBottom:'12px' }}>
              ℹ️ After saving, invite this person to log in via Supabase Auth → Users → Invite user with the same email.
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveStaff} disabled={saving}>{saving?'Saving...':'Save staff member'}</button>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
          {loading && <div style={{ gridColumn:'span 4', padding:'3rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading staff...</div>}
          {!loading && staffList.length === 0 && (
            <div style={{ gridColumn:'span 4', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
              <div style={{ fontSize:'32px', marginBottom:'12px' }}>🏆</div>
              <div style={{ fontWeight:600, marginBottom:'6px' }}>No staff yet</div>
              <button style={btnGold} onClick={function(){setShowNew(true)}}>+ Add first staff member</button>
            </div>
          )}
          {staffList.map(function(member){
            var sd = member.staff&&member.staff[0]?member.staff[0]:{}
            var ini = (member.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
            var payRate = sd.default_pay_rate?'$'+parseFloat(sd.default_pay_rate).toFixed(0)+'/'+sd.pay_rate_type:'—'
            return (
              <div key={member.id} onClick={function(){openStaff(member)}} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'12px' }}>
                  <div style={{ width:'44px', height:'44px', borderRadius:'50%', background:'#0D0D0D', color:'#D4A843', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'15px', fontWeight:700, flexShrink:0 }}>{ini}</div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'4px' }}>{member.full_name}</div>
                    {roleBadge(member.role)}
                  </div>
                </div>
                <div style={{ fontSize:'12px', color:'#888', display:'grid', gap:'4px' }}>
                  <div>✉ {member.email}</div>
                  {member.phone && <div>📱 {member.phone}</div>}
                  <div>💳 {payRate}</div>
                  {sd.bio && <div style={{ marginTop:'4px', fontSize:'12px', color:'#666', overflow:'hidden', textOverflow:'ellipsis', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{sd.bio}</div>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
