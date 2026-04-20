import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Waitlist() {
  var [waitlist, setWaitlist] = useState([])
  var [loading, setLoading] = useState(true)
  var [tab, setTab] = useState('waitlist')
  var [autoConfig, setAutoConfig] = useState({ enabled:true, window_hours:2, notify_channel:'email', cascade:true })
  var [saving, setSaving] = useState(false)
  var [saved, setSaved] = useState(false)
  var [processing, setProcessing] = useState(null)

  useEffect(function(){ loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    var r = await supabase.from('waitlist').select('*, profiles!waitlist_customer_id_fkey(full_name,email,phone), class_sessions(starts_at,classes(name,color,capacity)), appointments(starts_at,services(name))').order('created_at').limit(100)
    setWaitlist(r.data||[])
    setLoading(false)
  }

  async function promoteNext(sessionId) {
    setProcessing(sessionId)
    // Find first waiting entry for this session
    var entry = waitlist.find(function(w){ return w.type==='class' && w.ref_id===sessionId && w.status==='waiting' })
    if (!entry) { setProcessing(null); return }

    // Promote: create enrollment + mark notified
    await supabase.from('enrollments').insert({ class_id: entry.class_sessions&&entry.class_sessions.classes?null:null, session_id: sessionId, customer_id: entry.customer_id, status:'enrolled', payment_status:'unpaid' })
    await supabase.from('waitlist').update({ status:'converted', notified_at:new Date().toISOString() }).eq('id', entry.id)
    setProcessing(null)
    loadAll()
  }

  async function notifyNext(entryId) {
    await supabase.from('waitlist').update({ status:'notified', notified_at:new Date().toISOString(), expires_at: new Date(Date.now()+(autoConfig.window_hours*3600000)).toISOString() }).eq('id',entryId)
    setWaitlist(function(p){ return p.map(function(w){ return w.id===entryId?{...w,status:'notified',notified_at:new Date().toISOString()}:w }) })
  }

  async function removeFromWaitlist(id) {
    await supabase.from('waitlist').update({ status:'removed' }).eq('id',id)
    setWaitlist(function(p){ return p.filter(function(w){ return w.id!==id }) })
  }

  async function saveAutoConfig() {
    setSaving(true)
    var r = await supabase.from('waitlist_settings').select('id').limit(1).maybeSingle()
    if (r.data) await supabase.from('waitlist_settings').update({ config_json:autoConfig }).eq('id',r.data.id)
    else await supabase.from('waitlist_settings').insert({ config_json:autoConfig })
    setSaving(false); setSaved(true)
    setTimeout(function(){setSaved(false)},2500)
  }

  // Group waitlist by session/appointment
  var grouped = {}
  waitlist.filter(function(w){return w.status==='waiting'||w.status==='notified'}).forEach(function(w){
    var key = w.ref_id
    if (!grouped[key]) grouped[key] = { entries:[], meta:w }
    grouped[key].entries.push(w)
  })

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  function tabStyle(t) {
    return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' }
  }

  function Toggle({ on, onToggle, label, sub }) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0' }}>
        <div><div style={{ fontSize:'13px', fontWeight:500 }}>{label}</div>{sub&&<div style={{ fontSize:'12px', color:'#888',marginTop:'2px' }}>{sub}</div>}</div>
        <div onClick={onToggle} style={{ width:'38px', height:'21px', borderRadius:'11px', background:on?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', flexShrink:0, transition:'background .15s' }}>
          <div style={{ position:'absolute', width:'17px', height:'17px', borderRadius:'50%', background:'#fff', top:'2px', right:on?'2px':'19px', transition:'right .15s' }}></div>
        </div>
      </div>
    )
  }

  var statusColors = { waiting:['#EEEDFE','#534AB7'], notified:['#FAEEDA','#854F0B'], converted:['#E1F5EE','#0F6E56'], expired:['#FCEBEB','#A32D2D'], removed:['#F1EFE8','#5F5E5A'] }

  return (
    <AdminLayout active="waitlist">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Waitlist</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Auto-promotion waterfall — when a spot opens, the next person is notified</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px', marginBottom:'1.25rem' }}>
          {[
            ['Waiting', waitlist.filter(function(w){return w.status==='waiting'}).length, '#534AB7'],
            ['Notified (pending confirm)', waitlist.filter(function(w){return w.status==='notified'}).length, '#BA7517'],
            ['Converted today', waitlist.filter(function(w){return w.status==='converted'&&w.notified_at&&new Date(w.notified_at).toDateString()===new Date().toDateString()}).length, '#1D9E75'],
            ['Expired (missed window)', waitlist.filter(function(w){return w.status==='expired'}).length, '#A32D2D'],
          ].map(function(m,i){
            return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'14px' }}>
              <div style={{ fontSize:'11px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{m[0]}</div>
              <div style={{ fontSize:'22px', fontWeight:800, color:m[2] }}>{loading?'…':m[1]}</div>
            </div>
          })}
        </div>

        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
          <button style={tabStyle('waitlist')} onClick={function(){setTab('waitlist')}}>Active waitlists</button>
          <button style={tabStyle('settings')} onClick={function(){setTab('settings')}}>Auto-promotion settings</button>
          <button style={tabStyle('history')} onClick={function(){setTab('history')}}>History</button>
        </div>

        {/* ACTIVE WAITLISTS */}
        {tab === 'waitlist' && (
          <div>
            {autoConfig.enabled && (
              <div style={{ background:'#E1F5EE', border:'0.5px solid #5DCAA5', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#0F6E56', marginBottom:'1.25rem', display:'flex', gap:'10px', alignItems:'center' }}>
                <span style={{ fontSize:'18px' }}>🤖</span>
                <span>Auto-promotion is <strong>active</strong>. When a spot opens, the next person in line is automatically notified and given <strong>{autoConfig.window_hours} hour{autoConfig.window_hours!==1?'s':''}</strong> to confirm.</span>
              </div>
            )}

            {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}

            {!loading && Object.keys(grouped).length === 0 && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>
                <div style={{ fontSize:'32px', marginBottom:'14px' }}>✅</div>
                <div style={{ fontWeight:600, marginBottom:'6px' }}>No active waitlists</div>
                <div style={{ fontSize:'13px' }}>When classes fill up and customers join waitlists, they'll appear here.</div>
              </div>
            )}

            {Object.keys(grouped).map(function(sessionId){
              var group = grouped[sessionId]
              var meta = group.meta
              var sess = meta.class_sessions
              var cls = sess && sess.classes ? sess.classes : {}
              var sessionDate = sess ? new Date(sess.starts_at).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}) : '—'
              var sessionTime = sess ? new Date(sess.starts_at).toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit'}) : '—'

              return (
                <div key={sessionId} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden', marginBottom:'12px' }}>
                  <div style={{ padding:'12px 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:'12px', background:'#f9f9f7' }}>
                    <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:cls.color||'#D4A843', flexShrink:0 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:600 }}>{cls.name||'Class'}</div>
                      <div style={{ fontSize:'12px', color:'#888' }}>{sessionDate} · {sessionTime} · {group.entries.length} waiting</div>
                    </div>
                    <button style={btnGold} onClick={function(){promoteNext(sessionId)}} disabled={processing===sessionId}>
                      {processing===sessionId?'Promoting...':'⬆ Promote next'}
                    </button>
                  </div>
                  {group.entries.map(function(entry, i){
                    var cust = entry.profiles||{}
                    var ini = (cust.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                    var sc = statusColors[entry.status]||statusColors.waiting
                    var isNotified = entry.status === 'notified'
                    var expiresIn = entry.expires_at ? Math.max(0,Math.floor((new Date(entry.expires_at)-Date.now())/3600000)) : null

                    return (
                      <div key={entry.id} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'10px 1.25rem', borderBottom:i<group.entries.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                        <div style={{ width:'24px', height:'24px', borderRadius:'50%', background:sc[0], color:sc[1], display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, flexShrink:0 }}>#{i+1}</div>
                        <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, flexShrink:0 }}>{ini}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:'13px', fontWeight:500 }}>{cust.full_name||'—'}</div>
                          <div style={{ fontSize:'11px', color:'#888' }}>{cust.email}</div>
                          {isNotified && expiresIn !== null && <div style={{ fontSize:'11px', color:'#BA7517', marginTop:'2px' }}>⏱ Window expires in {expiresIn}h</div>}
                          {entry.notified_at && <div style={{ fontSize:'11px', color:'#aaa' }}>Notified {new Date(entry.notified_at).toLocaleString()}</div>}
                        </div>
                        <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{entry.status}</span>
                        {!isNotified && <button style={{ ...btn, fontSize:'12px', padding:'4px 10px', color:'#185FA5' }} onClick={function(){notifyNext(entry.id)}}>Notify</button>}
                        <button style={{ ...btn, fontSize:'12px', padding:'4px 10px', color:'#A32D2D' }} onClick={function(){removeFromWaitlist(entry.id)}}>Remove</button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
        )}

        {/* AUTO-PROMOTION SETTINGS */}
        {tab === 'settings' && (
          <div style={{ maxWidth:'560px' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Auto-promotion waterfall</div>
              <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>When a spot opens, automatically notify the next person in line and give them a window to confirm before moving to the next.</div>

              <Toggle on={autoConfig.enabled} onToggle={function(){setAutoConfig(function(p){return{...p,enabled:!p.enabled}})}} label="Auto-promotion enabled" sub="Automatically notify waitlist when a spot opens" />
              <Toggle on={autoConfig.cascade} onToggle={function(){setAutoConfig(function(p){return{...p,cascade:!p.cascade}})}} label="Cascade to next if no response" sub="If person doesn't confirm within the window, notify the next person automatically" />

              <div style={{ borderTop:'0.5px solid rgba(0,0,0,0.08)', paddingTop:'1rem', marginTop:'4px' }}>
                <div style={{ marginBottom:'14px' }}>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Confirmation window (hours)</div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    {[1,2,4,8,24].map(function(h){
                      var active = autoConfig.window_hours === h
                      return <button key={h} onClick={function(){setAutoConfig(function(p){return{...p,window_hours:h}})}} style={{ padding:'7px 14px', borderRadius:'8px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'13px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{h}h</button>
                    })}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Notification channel</div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    {[['email','✉ Email'],['sms','💬 SMS'],['both','Both']].map(function(ch){
                      var active = autoConfig.notify_channel === ch[0]
                      return <button key={ch[0]} onClick={function(){setAutoConfig(function(p){return{...p,notify_channel:ch[0]}})}} style={{ padding:'7px 14px', borderRadius:'8px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'13px', cursor:'pointer', fontFamily:'inherit', color:active?'#8B6914':'#666', fontWeight:active?600:400 }}>{ch[1]}</button>
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ background:'#F5E6C0', border:'0.5px solid #D4A843', borderRadius:'10px', padding:'12px 16px', fontSize:'13px', color:'#8B6914', marginBottom:'1rem', display:'flex', gap:'10px' }}>
              <span>💡</span>
              <span>Auto-promotion requires SendGrid (email) or Twilio (SMS) to be configured in <a href="/admin/notifications" style={{ color:'#8B6914', fontWeight:600 }}>Notifications → Integrations</a>.</span>
            </div>

            {saved && <div style={{ background:'#E1F5EE', border:'0.5px solid #5DCAA5', borderRadius:'8px', padding:'10px 16px', fontSize:'13px', color:'#0F6E56', marginBottom:'1rem' }}>✓ Settings saved.</div>}
            <button style={btnGold} onClick={saveAutoConfig} disabled={saving}>{saving?'Saving...':'Save settings'}</button>
          </div>
        )}

        {/* HISTORY */}
        {tab === 'history' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Customer','Session','Status','Joined','Notified',''].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
              </tr></thead>
              <tbody>
                {waitlist.length === 0 && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No waitlist history yet.</td></tr>}
                {waitlist.map(function(w,i){
                  var cust = w.profiles||{}
                  var sc = statusColors[w.status]||statusColors.waiting
                  return <tr key={w.id} style={{ borderBottom:i<waitlist.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <td style={{ padding:'10px 14px', fontWeight:500 }}>{cust.full_name||'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#666', fontSize:'12px' }}>{w.class_sessions&&w.class_sessions.classes?w.class_sessions.classes.name:'—'}</td>
                    <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{w.status}</span></td>
                    <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{w.created_at?w.created_at.substring(0,10):'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{w.notified_at?w.notified_at.substring(0,10):'—'}</td>
                    <td style={{ padding:'10px 14px' }}>{(w.status==='waiting'||w.status==='notified')&&<button style={{ ...btn, fontSize:'12px', padding:'4px 10px', color:'#A32D2D' }} onClick={function(){removeFromWaitlist(w.id)}}>Remove</button>}</td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
