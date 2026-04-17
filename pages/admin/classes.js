import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Classes() {
  var [classes, setClasses] = useState([])
  var [sessions, setSessions] = useState([])
  var [loading, setLoading] = useState(true)
  var [view, setView] = useState('list')
  var [showNew, setShowNew] = useState(false)
  var [form, setForm] = useState({ name:'', description:'', type:'single', color:'#D4A843', capacity:8, waitlist_size:3, duration_mins:60, price:25, payment_mode:'full', visibility:'public' })
  var [saving, setSaving] = useState(false)

  useEffect(function() {
    async function load() {
      var [clsR, sessR] = await Promise.all([
        supabase.from('classes').select('*, locations(name), profiles!classes_primary_coach_id_fkey(full_name)').eq('is_active', true).order('created_at', { ascending: false }),
        supabase.from('class_sessions').select('*, classes(name, color, capacity)').gte('starts_at', new Date().toISOString()).order('starts_at').limit(20),
      ])
      setClasses(clsR.data || [])
      setSessions(sessR.data || [])
      setLoading(false)
    }
    load()
  }, [])

  function setField(key, val) { setForm(function(prev) { var n={...prev}; n[key]=val; return n }) }

  async function saveClass() {
    setSaving(true)
    var result = await supabase.from('classes').insert({ ...form, capacity: parseInt(form.capacity), waitlist_size: parseInt(form.waitlist_size), duration_mins: parseInt(form.duration_mins), price: parseFloat(form.price) })
    setSaving(false)
    if (!result.error) {
      setShowNew(false)
      var clsR = await supabase.from('classes').select('*, locations(name)').eq('is_active', true).order('created_at', { ascending: false })
      setClasses(clsR.data || [])
    }
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  var DURATIONS = ['30','45','60','75','90','120']

  return (
    <AdminLayout active="classes">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Classes</div>
            <div style={{ fontSize:'13px', color:'#888' }}>{classes.length} active classes</div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <div style={{ display:'flex', background:'#fff', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'8px', padding:'3px' }}>
              {['list','sessions'].map(function(v){ return <button key={v} onClick={function(){setView(v)}} style={{ ...btn, border:'none', background:view===v?'#f5f5f3':'transparent', fontWeight:view===v?600:400, padding:'5px 12px', fontSize:'12px' }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button> })}
            </div>
            <button style={btnGold} onClick={function(){setShowNew(function(x){return !x})}}>+ New class</button>
          </div>
        </div>

        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Create class</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Class name</div><input type="text" style={inp} placeholder="e.g. Beginner Tennis — Adult Group" value={form.name} onChange={function(e){setField('name',e.target.value)}} /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Type</div>
                <select style={inp} value={form.type} onChange={function(e){setField('type',e.target.value)}}><option value="single">Single / Drop-in</option><option value="cohort">Cohort / Course</option></select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Price ($)</div><input type="number" style={inp} value={form.price} onChange={function(e){setField('price',e.target.value)}} /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Capacity</div><input type="number" style={inp} value={form.capacity} onChange={function(e){setField('capacity',e.target.value)}} /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Waitlist spots</div><input type="number" style={inp} value={form.waitlist_size} onChange={function(e){setField('waitlist_size',e.target.value)}} /></div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'6px' }}>Duration</div>
                <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                  {DURATIONS.map(function(d){ var active = form.duration_mins === parseInt(d); return <button key={d} onClick={function(){setField('duration_mins',parseInt(d))}} style={{ padding:'6px 12px', borderRadius:'8px', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#B8922E':'#666', fontWeight:active?600:400 }}>{d}m</button> })}
                </div>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Visibility</div>
                <select style={inp} value={form.visibility} onChange={function(e){setField('visibility',e.target.value)}}><option value="public">Public</option><option value="private">Private (link only)</option><option value="internal">Internal only</option></select>
              </div>
            </div>
            <div style={{ marginBottom:'12px' }}>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description</div>
              <textarea style={{ ...inp, resize:'vertical', minHeight:'70px' }} placeholder="Describe this class for students..." value={form.description} onChange={function(e){setField('description',e.target.value)}} />
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveClass} disabled={saving}>{saving?'Saving...':'Save class'}</button>
            </div>
          </div>
        )}

        {view === 'list' && (
          <div style={{ display:'grid', gap:'10px' }}>
            {loading && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading classes...</div>}
            {!loading && classes.length === 0 && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}>
                <div style={{ fontSize:'32px', marginBottom:'12px' }}>🎾</div>
                <div style={{ fontWeight:600, marginBottom:'6px' }}>No classes yet</div>
                <div style={{ fontSize:'13px', color:'#888', marginBottom:'1rem' }}>Create your first class to start taking bookings.</div>
                <button style={btnGold} onClick={function(){setShowNew(true)}}>+ Create class</button>
              </div>
            )}
            {classes.map(function(cls) {
              var coach = cls.profiles ? cls.profiles.full_name : 'Unassigned'
              var loc = cls.locations ? cls.locations.name : 'TBD'
              return (
                <div key={cls.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', display:'flex', alignItems:'center', gap:'14px' }}>
                  <div style={{ width:'12px', height:'12px', borderRadius:'50%', background:cls.color||'#D4A843', flexShrink:0 }}></div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>
                      <div style={{ fontSize:'15px', fontWeight:600 }}>{cls.name}</div>
                      <span style={{ display:'inline-block', padding:'1px 8px', borderRadius:'6px', fontSize:'11px', background:cls.type==='cohort'?'#EEEDFE':'#E1F5EE', color:cls.type==='cohort'?'#534AB7':'#0F6E56', fontWeight:500 }}>{cls.type === 'cohort' ? 'Cohort' : 'Drop-in'}</span>
                    </div>
                    <div style={{ fontSize:'12px', color:'#888', display:'flex', gap:'14px', flexWrap:'wrap' }}>
                      <span>👤 {coach}</span>
                      <span>📍 {loc}</span>
                      <span>⏱ {cls.duration_mins}min</span>
                      <span>👥 Cap: {cls.capacity}</span>
                      <span>💳 ${parseFloat(cls.price||0).toFixed(0)}/session</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px' }}>
                    <button style={btn} onClick={function(){alert('Add sessions for: '+cls.name)}}>+ Sessions</button>
                    <button style={btn}>Edit</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {view === 'sessions' && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Class','Date','Time','Enrolled','Capacity','Status',''].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)' }}>{h}</th> })}
              </tr></thead>
              <tbody>
                {loading && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                {sessions.map(function(s, i) {
                  var cls = s.classes || {}
                  var date = new Date(s.starts_at).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric' })
                  var time = new Date(s.starts_at).toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })
                  var pct = cls.capacity ? Math.round((s.enrolled_count/cls.capacity)*100) : 0
                  return (
                    <tr key={s.id} style={{ borderBottom:i<sessions.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                      <td style={{ padding:'10px 14px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                          <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:cls.color||'#D4A843', flexShrink:0 }}></div>
                          <span style={{ fontWeight:500 }}>{cls.name}</span>
                        </div>
                      </td>
                      <td style={{ padding:'10px 14px', color:'#666' }}>{date}</td>
                      <td style={{ padding:'10px 14px', color:'#666' }}>{time}</td>
                      <td style={{ padding:'10px 14px', fontWeight:500, color:pct>=90?'#A32D2D':pct>=70?'#BA7517':'#1D9E75' }}>{s.enrolled_count}</td>
                      <td style={{ padding:'10px 14px', color:'#666' }}>{cls.capacity}</td>
                      <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:'#E1F5EE', color:'#0F6E56', fontWeight:500 }}>scheduled</span></td>
                      <td style={{ padding:'10px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px' }}>Manage</button></td>
                    </tr>
                  )
                })}
                {!loading && sessions.length === 0 && <tr><td colSpan="7" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No upcoming sessions</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
