import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Tasks() {
  var [tasks, setTasks] = useState([])
  var [staff, setStaff] = useState([])
  var [loading, setLoading] = useState(true)
  var [showNew, setShowNew] = useState(false)
  var [form, setForm] = useState({ title:'', description:'', assigned_to:'', due_date:'', priority:'medium' })
  var [filter, setFilter] = useState('open')

  useEffect(function(){
    async function load(){
      var [tR, sR] = await Promise.all([
        supabase.from('tasks').select('*, profiles!tasks_assigned_to_fkey(full_name)').order('due_date'),
        supabase.from('profiles').select('id,full_name').in('role',['coach','staff','manager']).eq('is_active',true)
      ])
      setTasks(tR.data||[]); setStaff(sR.data||[]); setLoading(false)
    }
    load()
  },[])

  async function saveTask(){
    var s = await supabase.auth.getSession()
    if (!s.data.session) return
    await supabase.from('tasks').insert({ ...form, created_by:s.data.session.user.id, status:'open' })
    setShowNew(false); setForm({ title:'', description:'', assigned_to:'', due_date:'', priority:'medium' })
    var r = await supabase.from('tasks').select('*, profiles!tasks_assigned_to_fkey(full_name)').order('due_date')
    setTasks(r.data||[])
  }

  async function updateStatus(id, status){
    await supabase.from('tasks').update({status}).eq('id',id)
    setTasks(function(p){return p.map(function(t){return t.id===id?{...t,status}:t})})
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var pColors = { low:['#E1F5EE','#0F6E56'], medium:['#FAEEDA','#854F0B'], high:['#FCEBEB','#A32D2D'] }
  var sColors = { open:['#E6F1FB','#185FA5'], in_progress:['#FAEEDA','#854F0B'], complete:['#E1F5EE','#0F6E56'] }
  var filtered = tasks.filter(function(t){ return filter==='all'||t.status===filter })

  return (
    <AdminLayout active="tasks">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div><div style={{ fontSize:'22px', fontWeight:700 }}>Tasks</div><div style={{ fontSize:'13px', color:'#888' }}>{tasks.filter(function(t){return t.status==='open'}).length} open tasks</div></div>
          <button style={btnGold} onClick={function(){setShowNew(function(x){return !x})}}>+ New task</button>
        </div>

        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Create task</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Task title</div><input type="text" style={inp} placeholder="e.g. Follow up with new student" value={form.title} onChange={function(e){setForm(function(p){return{...p,title:e.target.value}})}} /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Assign to</div>
                <select style={inp} value={form.assigned_to} onChange={function(e){setForm(function(p){return{...p,assigned_to:e.target.value}})}}>
                  <option value="">Select staff...</option>{staff.map(function(s){return <option key={s.id} value={s.id}>{s.full_name}</option>})}
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Due date</div><input type="date" style={inp} value={form.due_date} onChange={function(e){setForm(function(p){return{...p,due_date:e.target.value}})}} /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Priority</div>
                <select style={inp} value={form.priority} onChange={function(e){setForm(function(p){return{...p,priority:e.target.value}})}}>
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
                </select>
              </div>
              <div style={{ gridColumn:'span 1' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description</div><textarea style={{ ...inp, resize:'none', height:'60px' }} value={form.description} onChange={function(e){setForm(function(p){return{...p,description:e.target.value}})}} /></div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveTask}>Save task</button>
            </div>
          </div>
        )}

        <div style={{ display:'flex', gap:'6px', marginBottom:'1rem' }}>
          {[['all','All'],['open','Open'],['in_progress','In progress'],['complete','Complete']].map(function(f){
            return <button key={f[0]} onClick={function(){setFilter(f[0])}} style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12px', cursor:'pointer', border:'0.5px solid '+(filter===f[0]?'#D4A843':'rgba(0,0,0,0.15)'), background:filter===f[0]?'#D4A843':'transparent', color:filter===f[0]?'#0D0D0D':'#666', fontFamily:'inherit', fontWeight:filter===f[0]?600:400 }}>{f[1]}</button>
          })}
        </div>

        <div style={{ display:'grid', gap:'8px' }}>
          {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
          {!loading && filtered.length === 0 && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center' }}><div style={{ fontSize:'32px', marginBottom:'12px' }}>✅</div><div style={{ fontWeight:600 }}>No tasks</div></div>}
          {filtered.map(function(t){
            var pc = pColors[t.priority]||pColors.medium
            var sc = sColors[t.status]||sColors.open
            var assignee = t.profiles ? t.profiles.full_name : 'Unassigned'
            return (
              <div key={t.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'12px 1.25rem', display:'flex', alignItems:'center', gap:'12px' }}>
                <input type="checkbox" checked={t.status==='complete'} onChange={function(){updateStatus(t.id, t.status==='complete'?'open':'complete')}} style={{ width:'16px', height:'16px', cursor:'pointer' }} />
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'13px', fontWeight:500, textDecoration:t.status==='complete'?'line-through':'none', color:t.status==='complete'?'#aaa':'#1a1a1a' }}>{t.title}</div>
                  <div style={{ fontSize:'12px', color:'#888', marginTop:'2px' }}>Assigned to {assignee} {t.due_date?' · Due '+t.due_date:''}</div>
                </div>
                <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:pc[0], color:pc[1], fontWeight:500 }}>{t.priority}</span>
                <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{t.status.replace('_',' ')}</span>
                <select style={{ fontSize:'12px', padding:'4px 8px', borderRadius:'6px', border:'0.5px solid rgba(0,0,0,0.15)', background:'#fff', fontFamily:'inherit', cursor:'pointer' }} value={t.status} onChange={function(e){updateStatus(t.id,e.target.value)}}>
                  <option value="open">Open</option><option value="in_progress">In progress</option><option value="complete">Complete</option>
                </select>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
