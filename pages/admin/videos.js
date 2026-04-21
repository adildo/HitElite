import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Videos() {
  var [videos, setVideos] = useState([])
  var [loading, setLoading] = useState(true)
  var [showNew, setShowNew] = useState(false)
  var [saving, setSaving] = useState(false)
  var [search, setSearch] = useState('')
  var [filterAccess, setFilterAccess] = useState('all')
  var [form, setForm] = useState({ title:'', description:'', video_url:'', thumbnail_url:'', access_type:'after_session', price:'', coach_id:'', tags:'' })
  var [coaches, setCoaches] = useState([])

  useEffect(function(){ loadAll() },[])

  async function loadAll() {
    setLoading(true)
    var [vidR, coachR] = await Promise.all([
      supabase.from('videos').select('*, profiles!videos_coach_id_fkey(full_name)').order('created_at',{ascending:false}),
      supabase.from('profiles').select('id,full_name').in('role',['coach']).eq('is_active',true),
    ])
    setVideos(vidR.data||[])
    setCoaches(coachR.data||[])
    setLoading(false)
  }

  async function saveVideo() {
    setSaving(true)
    await supabase.from('videos').insert({ title:form.title, description:form.description, video_url:form.video_url, thumbnail_url:form.thumbnail_url||null, access_type:form.access_type, price:form.price?parseFloat(form.price):null, coach_id:form.coach_id||null, tags:form.tags?form.tags.split(',').map(function(t){return t.trim()}):[], is_published:true })
    setSaving(false); setShowNew(false)
    setForm({ title:'', description:'', video_url:'', thumbnail_url:'', access_type:'after_session', price:'', coach_id:'', tags:'' })
    loadAll()
  }

  async function togglePublished(id, current) {
    await supabase.from('videos').update({ is_published:!current }).eq('id',id)
    setVideos(function(p){ return p.map(function(v){ return v.id===id?{...v,is_published:!current}:v }) })
  }

  var filtered = videos.filter(function(v){
    if (filterAccess !== 'all' && v.access_type !== filterAccess) return false
    if (search && !(v.title||'').toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  var accessLabels = { after_session:'After session', always:'Always free', paid:'Paid access', enrolled:'Enrolled customers' }
  var accessColors = { after_session:['#EEEDFE','#534AB7'], always:['#E1F5EE','#0F6E56'], paid:['#F5E6C0','#8B6914'], enrolled:['#E6F1FB','#185FA5'] }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { ...inp, fontFamily:'inherit' }

  return (
    <AdminLayout active="settings">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Video library</div>
            <div style={{ fontSize:'13px', color:'#888' }}>On-demand instructional content for your customers</div>
          </div>
          <button style={btnGold} onClick={function(){setShowNew(function(x){return !x})}}>+ Add video</button>
        </div>

        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Add new video</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Title</div><input type="text" style={inp} value={form.title} onChange={function(e){setForm(function(p){return{...p,title:e.target.value}})}} placeholder="e.g. Mastering the Topspin Forehand" /></div>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description</div><textarea style={{ ...inp, resize:'none', height:'70px' }} value={form.description} onChange={function(e){setForm(function(p){return{...p,description:e.target.value}})}} placeholder="What will customers learn in this video?" /></div>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Video URL (YouTube, Vimeo, or Cloudflare Stream)</div><input type="text" style={inp} value={form.video_url} onChange={function(e){setForm(function(p){return{...p,video_url:e.target.value}})}} placeholder="https://vimeo.com/..." /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Coach</div>
                <select style={sel} value={form.coach_id} onChange={function(e){setForm(function(p){return{...p,coach_id:e.target.value}})}}>
                  <option value="">Any / general</option>
                  {coaches.map(function(c){return <option key={c.id} value={c.id}>{c.full_name}</option>})}
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Access</div>
                <select style={sel} value={form.access_type} onChange={function(e){setForm(function(p){return{...p,access_type:e.target.value}})}}>
                  <option value="after_session">After attending a session</option>
                  <option value="enrolled">Enrolled customers only</option>
                  <option value="always">Free for all customers</option>
                  <option value="paid">Paid access</option>
                </select>
              </div>
              {form.access_type === 'paid' && (
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Price ($)</div><input type="number" style={inp} value={form.price} onChange={function(e){setForm(function(p){return{...p,price:e.target.value}})}} placeholder="9.99" /></div>
              )}
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Tags (comma-separated)</div><input type="text" style={inp} value={form.tags} onChange={function(e){setForm(function(p){return{...p,tags:e.target.value}})}} placeholder="forehand, beginner, drills" /></div>
            </div>
            <div style={{ background:'#F5E6C0', border:'0.5px solid #D4A843', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#8B6914', marginBottom:'12px' }}>
              💡 For best results, upload videos to <strong>Vimeo</strong> or <strong>Cloudflare Stream</strong> and paste the embed URL here. YouTube links also work.
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveVideo} disabled={saving||!form.title||!form.video_url}>{saving?'Saving...':'Save video'}</button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{ display:'flex', gap:'8px', marginBottom:'1.25rem', flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:'200px' }}>
            <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#aaa' }}>⌕</span>
            <input type="text" style={{ ...inp, paddingLeft:'32px' }} placeholder="Search videos..." value={search} onChange={function(e){setSearch(e.target.value)}} />
          </div>
          <select style={{ ...sel, width:'auto' }} value={filterAccess} onChange={function(e){setFilterAccess(e.target.value)}}>
            <option value="all">All access types</option>
            {Object.keys(accessLabels).map(function(k){return <option key={k} value={k}>{accessLabels[k]}</option>})}
          </select>
        </div>

        {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:'32px', marginBottom:'14px' }}>🎬</div>
            <div style={{ fontWeight:600, marginBottom:'6px' }}>No videos yet</div>
            <div style={{ fontSize:'13px', marginBottom:'1.25rem' }}>Add instructional videos that customers can access after attending sessions.</div>
            <button style={btnGold} onClick={function(){setShowNew(true)}}>+ Add first video</button>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:'14px' }}>
          {filtered.map(function(v){
            var ac = accessColors[v.access_type]||accessColors.after_session
            var coach = v.profiles ? v.profiles.full_name : null
            return (
              <div key={v.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden', opacity:v.is_published?1:0.6 }}>
                {/* Thumbnail or placeholder */}
                <div style={{ height:'140px', background:'#0D0D0D', display:'flex', alignItems:'center', justifyContent:'center', position:'relative' }}>
                  {v.thumbnail_url ? (
                    <img src={v.thumbnail_url} alt={v.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  ) : (
                    <div style={{ textAlign:'center' }}>
                      <div style={{ fontSize:'36px', marginBottom:'6px' }}>▶</div>
                      <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.3)' }}>No thumbnail</div>
                    </div>
                  )}
                  {!v.is_published && <div style={{ position:'absolute', top:'8px', left:'8px', background:'rgba(0,0,0,0.7)', color:'#fff', fontSize:'11px', padding:'2px 8px', borderRadius:'6px' }}>Draft</div>}
                </div>
                <div style={{ padding:'1rem' }}>
                  <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'4px' }}>{v.title}</div>
                  {coach && <div style={{ fontSize:'12px', color:'#888', marginBottom:'6px' }}>By {coach}</div>}
                  {v.description && <div style={{ fontSize:'12px', color:'#666', marginBottom:'8px', lineHeight:1.5, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{v.description}</div>}
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:ac[0], color:ac[1], fontWeight:500 }}>
                      {accessLabels[v.access_type]||v.access_type}
                      {v.access_type==='paid'&&v.price?' · $'+v.price:''}
                    </span>
                    <div style={{ display:'flex', gap:'6px' }}>
                      <button style={{ ...btn, fontSize:'11px', padding:'4px 8px' }} onClick={function(){togglePublished(v.id,v.is_published)}}>{v.is_published?'Unpublish':'Publish'}</button>
                      <button style={{ ...btn, fontSize:'11px', padding:'4px 8px', color:'#A32D2D' }} onClick={async function(){ if(confirm('Delete this video?')) { await supabase.from('videos').delete().eq('id',v.id); setVideos(function(p){return p.filter(function(x){return x.id!==v.id})}) } }}>Delete</button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
