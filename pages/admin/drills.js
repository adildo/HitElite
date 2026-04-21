import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var CATEGORIES = ['Forehand','Backhand','Serve','Volley','Footwork','Strategy','Fitness','Pickleball','Beginner','Advanced']

export default function Drills() {
  var [drills, setDrills] = useState([])
  var [loading, setLoading] = useState(true)
  var [showNew, setShowNew] = useState(false)
  var [saving, setSaving] = useState(false)
  var [search, setSearch] = useState('')
  var [filterCat, setFilterCat] = useState('')
  var [editingId, setEditingId] = useState(null)
  var [form, setForm] = useState({ name:'', description:'', category:'Forehand', video_url:'', difficulty:'beginner', duration_mins:'10' })

  useEffect(function(){ loadDrills() },[])

  async function loadDrills() {
    setLoading(true)
    var r = await supabase.from('drills').select('*').order('created_at',{ascending:false})
    setDrills(r.data||[])
    setLoading(false)
  }

  function setField(k,v){ setForm(function(p){ return {...p,[k]:v} }) }

  async function saveDrill() {
    if (!form.name.trim()) return
    setSaving(true)
    var payload = { name:form.name, description:form.description, category:form.category, video_url:form.video_url||null, difficulty:form.difficulty, duration_mins:parseInt(form.duration_mins)||10 }
    if (editingId) await supabase.from('drills').update(payload).eq('id',editingId)
    else await supabase.from('drills').insert(payload)
    setSaving(false); setShowNew(false); setEditingId(null)
    setForm({ name:'', description:'', category:'Forehand', video_url:'', difficulty:'beginner', duration_mins:'10' })
    loadDrills()
  }

  async function deleteDrill(id) {
    if (!confirm('Delete this drill?')) return
    await supabase.from('drills').delete().eq('id',id)
    setDrills(function(p){ return p.filter(function(d){ return d.id!==id }) })
  }

  function editDrill(drill) {
    setForm({ name:drill.name, description:drill.description||'', category:drill.category||'Forehand', video_url:drill.video_url||'', difficulty:drill.difficulty||'beginner', duration_mins:drill.duration_mins||'10' })
    setEditingId(drill.id); setShowNew(true)
  }

  var filtered = drills.filter(function(d){
    if (filterCat && d.category !== filterCat) return false
    if (search && !(d.name||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  var diffColors = { beginner:['#E1F5EE','#0F6E56'], intermediate:['#FAEEDA','#854F0B'], advanced:['#FCEBEB','#A32D2D'] }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { ...inp, fontFamily:'inherit' }

  return (
    <AdminLayout active="staff">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Drill & exercise library</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Shared library coaches can assign as homework after sessions</div>
          </div>
          <button style={btnGold} onClick={function(){setShowNew(function(x){return !x});setEditingId(null);setForm({ name:'', description:'', category:'Forehand', video_url:'', difficulty:'beginner', duration_mins:'10' })}}>+ Add drill</button>
        </div>

        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>{editingId?'Edit drill':'Add new drill'}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Drill name</div><input type="text" style={inp} value={form.name} onChange={function(e){setField('name',e.target.value)}} placeholder="e.g. Cross-court forehand rally" /></div>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description</div><textarea style={{ ...inp, resize:'none', height:'70px' }} value={form.description} onChange={function(e){setField('description',e.target.value)}} placeholder="Explain the drill, setup, repetitions..." /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Category</div>
                <select style={sel} value={form.category} onChange={function(e){setField('category',e.target.value)}}>
                  {CATEGORIES.map(function(c){ return <option key={c}>{c}</option> })}
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Difficulty</div>
                <select style={sel} value={form.difficulty} onChange={function(e){setField('difficulty',e.target.value)}}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Duration (minutes)</div><input type="number" style={inp} value={form.duration_mins} onChange={function(e){setField('duration_mins',e.target.value)}} placeholder="10" /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Video URL (optional)</div><input type="text" style={inp} value={form.video_url} onChange={function(e){setField('video_url',e.target.value)}} placeholder="https://youtube.com/..." /></div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveDrill} disabled={saving||!form.name}>{saving?'Saving...':editingId?'Save changes':'Add drill'}</button>
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:'8px', marginBottom:'1.25rem', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
            <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#aaa' }}>⌕</span>
            <input type="text" style={{ ...inp, paddingLeft:'32px' }} placeholder="Search drills..." value={search} onChange={function(e){setSearch(e.target.value)}} />
          </div>
          <select style={{ ...sel, width:'auto' }} value={filterCat} onChange={function(e){setFilterCat(e.target.value)}}>
            <option value="">All categories</option>
            {CATEGORIES.map(function(c){ return <option key={c}>{c}</option> })}
          </select>
          <div style={{ fontSize:'13px', color:'#888', display:'flex', alignItems:'center' }}>{filtered.length} drill{filtered.length!==1?'s':''}</div>
        </div>

        {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:'32px', marginBottom:'14px' }}>🎾</div>
            <div style={{ fontWeight:600, marginBottom:'6px' }}>No drills yet</div>
            <div style={{ fontSize:'13px', marginBottom:'1.25rem' }}>Build a shared drill library that coaches can assign as homework after sessions.</div>
            <button style={btnGold} onClick={function(){setShowNew(true)}}>+ Add first drill</button>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'14px' }}>
          {filtered.map(function(drill){
            var dc = diffColors[drill.difficulty]||diffColors.beginner
            return (
              <div key={drill.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                  <div style={{ fontSize:'14px', fontWeight:600, flex:1, marginRight:'8px' }}>{drill.name}</div>
                  <div style={{ display:'flex', gap:'4px', flexShrink:0 }}>
                    <button style={{ ...btn, fontSize:'11px', padding:'3px 8px' }} onClick={function(){editDrill(drill)}}>Edit</button>
                    <button style={{ ...btn, fontSize:'11px', padding:'3px 8px', color:'#A32D2D' }} onClick={function(){deleteDrill(drill.id)}}>Delete</button>
                  </div>
                </div>
                {drill.description && <div style={{ fontSize:'12px', color:'#666', lineHeight:1.5, marginBottom:'10px', overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{drill.description}</div>}
                <div style={{ display:'flex', flexWrap:'wrap', gap:'5px' }}>
                  <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:'#F5E6C0', color:'#8B6914', fontWeight:500 }}>{drill.category}</span>
                  <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:dc[0], color:dc[1], fontWeight:500 }}>{drill.difficulty}</span>
                  <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:'#f1f1f1', color:'#666' }}>⏱ {drill.duration_mins} min</span>
                  {drill.video_url && <a href={drill.video_url} target="_blank" rel="noreferrer" style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:'#EEEDFE', color:'#534AB7', fontWeight:500, textDecoration:'none' }}>▶ Video</a>}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
