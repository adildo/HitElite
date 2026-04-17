import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Services() {
  var [inner, setInner] = useState('services')
  var [services, setServices] = useState([])
  var [categories, setCategories] = useState([])
  var [addons, setAddons] = useState([])
  var [search, setSearch] = useState('')
  var [loading, setLoading] = useState(true)
  var [showCreate, setShowCreate] = useState(false)
  var [newSvc, setNewSvc] = useState({ name:'', description:'', category_id:'', duration_mins:60, price:'', payment_mode:'full', visibility:'public', booking_mode:'instant' })
  var [newCat, setNewCat] = useState('')
  var [newAddon, setNewAddon] = useState({ name:'', price:'', duration_added_mins:0, max_qty:1 })
  var [saving, setSaving] = useState(false)

  useEffect(function() { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    var [svcR, catR, addonR] = await Promise.all([
      supabase.from('services').select('*, service_categories(name), profiles!services_coach_id_fkey(full_name)').eq('is_active', true).order('name'),
      supabase.from('service_categories').select('*').order('display_order'),
      supabase.from('addons').select('*').eq('is_active', true).order('name'),
    ])
    setServices(svcR.data || [])
    setCategories(catR.data || [])
    setAddons(addonR.data || [])
    setLoading(false)
  }

  async function saveService() {
    setSaving(true)
    await supabase.from('services').insert({ ...newSvc, duration_mins:parseInt(newSvc.duration_mins), price:parseFloat(newSvc.price)||0 })
    setSaving(false); setShowCreate(false)
    setNewSvc({ name:'', description:'', category_id:'', duration_mins:60, price:'', payment_mode:'full', visibility:'public', booking_mode:'instant' })
    loadAll()
  }

  async function saveCategory() {
    if (!newCat.trim()) return
    await supabase.from('service_categories').insert({ name: newCat.trim(), display_order: categories.length })
    setNewCat(''); loadAll()
  }

  async function saveAddon() {
    setSaving(true)
    await supabase.from('addons').insert({ ...newAddon, price:parseFloat(newAddon.price)||0, duration_added_mins:parseInt(newAddon.duration_added_mins)||0, max_qty:parseInt(newAddon.max_qty)||1 })
    setSaving(false); setShowCreate(false)
    setNewAddon({ name:'', price:'', duration_added_mins:0, max_qty:1 })
    loadAll()
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnPurple = { ...btn, background:'#534AB7', color:'#fff', borderColor:'#534AB7', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  function innerTabStyle(id) {
    return {
      padding:'7px 16px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'none',
      background:inner===id?'#EEEDFE':'transparent', color:inner===id?'#534AB7':'#666',
      fontWeight:inner===id?600:400, fontFamily:'inherit', display:'flex', alignItems:'center', gap:'6px'
    }
  }

  var DURATIONS = [30,45,60,75,90,120]
  var filteredSvcs = services.filter(function(s){ return !search || s.name.toLowerCase().includes(search.toLowerCase()) })
  var createLabels = { services:'Create service', categories:'Create category', addons:'Create add-on', pricelevels:'Create price level' }

  return (
    <AdminLayout active="services">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div style={{ fontSize:'22px', fontWeight:700 }}>Appointment services</div>
          <button style={btnPurple} onClick={function(){setShowCreate(function(x){return !x})}}>+ {createLabels[inner]}</button>
        </div>

        <div style={{ display:'flex', gap:'2px', background:'#fff', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'12px', padding:'5px', marginBottom:'1.25rem', width:'fit-content' }}>
          {[['services','Services'],['categories','Categories'],['addons','Add-ons'],['pricelevels','Price levels']].map(function(t){
            return <button key={t[0]} style={innerTabStyle(t[0])} onClick={function(){setInner(t[0]);setShowCreate(false)}}>{t[1]}</button>
          })}
        </div>

        {showCreate && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>{createLabels[inner]}</div>
            {inner === 'services' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Service name</div><input type="text" style={inp} placeholder="e.g. 60-Min Private Tennis Lesson" value={newSvc.name} onChange={function(e){setNewSvc(function(p){return{...p,name:e.target.value}})}} /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Price ($)</div><input type="number" style={inp} value={newSvc.price} onChange={function(e){setNewSvc(function(p){return{...p,price:e.target.value}})}} placeholder="80" /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Category</div>
                    <select style={inp} value={newSvc.category_id} onChange={function(e){setNewSvc(function(p){return{...p,category_id:e.target.value}})}}><option value="">Select category...</option>{categories.map(function(c){return <option key={c.id} value={c.id}>{c.name}</option>})}</select>
                  </div>
                  <div>
                    <div style={{ fontSize:'12px', color:'#666', marginBottom:'6px' }}>Duration</div>
                    <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                      {DURATIONS.map(function(d){ var active=newSvc.duration_mins===d; return <button key={d} onClick={function(){setNewSvc(function(p){return{...p,duration_mins:d}})}} style={{ padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(active?'#534AB7':'rgba(0,0,0,0.15)'), background:active?'#EEEDFE':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#534AB7':'#666', fontWeight:active?600:400 }}>{d}m</button> })}
                    </div>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Booking mode</div>
                    <select style={inp} value={newSvc.booking_mode} onChange={function(e){setNewSvc(function(p){return{...p,booking_mode:e.target.value}})}}><option value="instant">Instant book</option><option value="request">Request (requires approval)</option></select>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Visibility</div>
                    <select style={inp} value={newSvc.visibility} onChange={function(e){setNewSvc(function(p){return{...p,visibility:e.target.value}})}}><option value="public">Public</option><option value="private">Private (link only)</option><option value="staff_only">Staff only</option></select>
                  </div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Payment mode</div>
                    <select style={inp} value={newSvc.payment_mode} onChange={function(e){setNewSvc(function(p){return{...p,payment_mode:e.target.value}})}}><option value="full">Pay full price</option><option value="deposit">Pay deposit</option><option value="card_on_file">Card on file</option><option value="free">Free</option></select>
                  </div>
                  <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description</div><textarea style={{ ...inp, resize:'none', height:'70px' }} value={newSvc.description} onChange={function(e){setNewSvc(function(p){return{...p,description:e.target.value}})}} placeholder="Describe this service for customers..." /></div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setShowCreate(false)}}>Cancel</button>
                  <button style={btnPurple} onClick={saveService} disabled={saving}>{saving?'Saving...':'Save service'}</button>
                </div>
              </div>
            )}
            {inner === 'categories' && (
              <div>
                <div style={{ marginBottom:'12px' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Category name</div><input type="text" style={inp} value={newCat} onChange={function(e){setNewCat(e.target.value)}} placeholder="e.g. Private Lessons" /></div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setShowCreate(false)}}>Cancel</button>
                  <button style={btnPurple} onClick={saveCategory}>Save category</button>
                </div>
              </div>
            )}
            {inner === 'addons' && (
              <div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Add-on name</div><input type="text" style={inp} value={newAddon.name} onChange={function(e){setNewAddon(function(p){return{...p,name:e.target.value}})}} placeholder="e.g. Video Analysis" /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Price ($)</div><input type="number" style={inp} value={newAddon.price} onChange={function(e){setNewAddon(function(p){return{...p,price:e.target.value}})}} placeholder="20" /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Max quantity</div><input type="number" style={inp} value={newAddon.max_qty} onChange={function(e){setNewAddon(function(p){return{...p,max_qty:e.target.value}})}} placeholder="1" /></div>
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setShowCreate(false)}}>Cancel</button>
                  <button style={btnPurple} onClick={saveAddon} disabled={saving}>{saving?'Saving...':'Save add-on'}</button>
                </div>
              </div>
            )}
            {inner === 'pricelevels' && (
              <div>
                <div style={{ marginBottom:'12px' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Price level name</div><input type="text" style={inp} placeholder="e.g. Member rate" /></div>
                <div style={{ display:'flex', gap:'8px' }}><button style={btn} onClick={function(){setShowCreate(false)}}>Cancel</button><button style={btnPurple}>Save price level</button></div>
              </div>
            )}
          </div>
        )}

        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
          {inner === 'services' && (
            <div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>
                <div style={{ position:'relative', width:'260px' }}>
                  <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#999', fontSize:'15px' }}>⌕</span>
                  <input type="text" style={{ ...inp, paddingLeft:'32px', borderRadius:'20px' }} placeholder="Search services..." value={search} onChange={function(e){setSearch(e.target.value)}} />
                </div>
                <button style={btn}>↕ Edit order</button>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ background:'#f9f9f7' }}>
                  {['Name','Price','Duration','Category','Booking',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th>})}
                </tr></thead>
                <tbody>
                  {loading && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                  {!loading && filteredSvcs.length === 0 && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No services yet. Click "+ Create service" to add one.</td></tr>}
                  {filteredSvcs.map(function(s, i) {
                    var cat = s.service_categories ? s.service_categories.name : '—'
                    return (
                      <tr key={s.id} style={{ borderBottom:i<filteredSvcs.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                        <td style={{ padding:'12px 14px' }}><div style={{ fontWeight:500 }}>{s.name}</div><div style={{ fontSize:'11px', color:'#888', marginTop:'2px', maxWidth:'300px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.description}</div></td>
                        <td style={{ padding:'12px 14px', color:'#666' }}>${parseFloat(s.price||0).toFixed(2)}</td>
                        <td style={{ padding:'12px 14px', color:'#666' }}>{s.duration_mins}min</td>
                        <td style={{ padding:'12px 14px', color:'#666' }}>{cat}</td>
                        <td style={{ padding:'12px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:s.booking_mode==='request'?'#FAEEDA':'#E1F5EE', color:s.booking_mode==='request'?'#854F0B':'#0F6E56', fontWeight:500 }}>{s.booking_mode}</span></td>
                        <td style={{ padding:'12px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px' }}>⋮</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
          {inner === 'categories' && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}><th style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>Name</th><th style={{ width:'60px', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}></th></tr></thead>
              <tbody>
                {categories.map(function(c,i){return <tr key={c.id} style={{ borderBottom:i<categories.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}><td style={{ padding:'12px 14px', fontWeight:500 }}>🗂 {c.name}</td><td style={{ padding:'12px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px' }}>⋮</button></td></tr>})}
                {!loading && categories.length === 0 && <tr><td colSpan="2" style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No categories yet</td></tr>}
              </tbody>
            </table>
          )}
          {inner === 'addons' && (
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Name','Price','Max qty',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th>})}
              </tr></thead>
              <tbody>
                {addons.map(function(a,i){return <tr key={a.id} style={{ borderBottom:i<addons.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}><td style={{ padding:'12px 14px', fontWeight:500 }}>{a.name}</td><td style={{ padding:'12px 14px', color:'#666' }}>${parseFloat(a.price||0).toFixed(2)}</td><td style={{ padding:'12px 14px', color:'#666' }}>{a.max_qty}</td><td style={{ padding:'12px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px' }}>⋮</button></td></tr>})}
                {!loading && addons.length === 0 && <tr><td colSpan="4" style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No add-ons yet</td></tr>}
              </tbody>
            </table>
          )}
          {inner === 'pricelevels' && (
            <div style={{ padding:'2rem', textAlign:'center', color:'#888', fontSize:'13px' }}>
              Price levels allow you to set custom rates per customer type. Create your first price level above.
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
