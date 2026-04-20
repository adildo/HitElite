import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var PRESET_SEGMENTS = [
  { name:'All customers', desc:'Everyone with an active account', filters:[], color:'#185FA5' },
  { name:'New this month', desc:'Signed up in the last 30 days', filters:[{field:'days_since_joined',op:'less_than',value:'30'}], color:'#1D9E75' },
  { name:'VIP', desc:'Tagged as VIP', filters:[{field:'tag',op:'has',value:'VIP'}], color:'#D4A843' },
  { name:'Tennis players', desc:'Tagged as Tennis', filters:[{field:'tag',op:'has',value:'Tennis'}], color:'#534AB7' },
  { name:'Pickleball players', desc:'Tagged as Pickleball', filters:[{field:'tag',op:'has',value:'Pickleball'}], color:'#D85A30' },
  { name:'Trial customers', desc:'Tagged as Trial', filters:[{field:'tag',op:'has',value:'Trial'}], color:'#BA7517' },
]

var FILTER_TYPES = [
  { value:'days_since_joined', label:'Days since joined', ops:['less_than','greater_than'] },
  { value:'tag', label:'Has tag', ops:['has','does not have'] },
  { value:'city', label:'City', ops:['is','contains'] },
  { value:'phone', label:'Has phone', ops:['is set','is not set'] },
]

export default function Customers() {
  var [tab, setTab] = useState('list')
  // List tab
  var [customers, setCustomers] = useState([])
  var [filtered, setFiltered] = useState([])
  var [search, setSearch] = useState('')
  var [loading, setLoading] = useState(true)
  var [selected, setSelected] = useState(new Set())
  var [activeCustomer, setActiveCustomer] = useState(null)
  var [showAdd, setShowAdd] = useState(false)
  var [newForm, setNewForm] = useState({ full_name:'', email:'', phone:'', city:'' })
  var [saving, setSaving] = useState(false)
  // Segments tab
  var [savedSegments, setSavedSegments] = useState([])
  var [tags, setTags] = useState([])
  var [showBuilder, setShowBuilder] = useState(false)
  var [segName, setSegName] = useState('')
  var [segDesc, setSegDesc] = useState('')
  var [filters, setFilters] = useState([{ field:'days_since_joined', op:'less_than', value:'30' }])
  var [previewCount, setPreviewCount] = useState(null)
  var [activeSegment, setActiveSegment] = useState(null)
  var [segCustomers, setSegCustomers] = useState([])

  useEffect(function() { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    var [custR, segR, tagR] = await Promise.all([
      supabase.from('profiles').select('id,full_name,email,phone,role,created_at,is_active,address_json').eq('role','customer').order('created_at',{ascending:false}),
      supabase.from('saved_segments').select('*').order('created_at',{ascending:false}),
      supabase.from('tags').select('id,name,color').eq('type','customer'),
    ])
    setCustomers(custR.data||[])
    setFiltered(custR.data||[])
    setSavedSegments(segR.data||[])
    setTags(tagR.data||[])
    setLoading(false)
  }

  useEffect(function() {
    var q = search.toLowerCase()
    setFiltered(customers.filter(function(c) {
      return !q || (c.full_name||'').toLowerCase().includes(q) || (c.email||'').includes(q) || (c.phone||'').includes(q)
    }))
  }, [search, customers])

  async function saveCustomer() {
    if (!newForm.full_name || !newForm.email) return
    setSaving(true)
    await supabase.from('profiles').insert({ id:crypto.randomUUID(), full_name:newForm.full_name, email:newForm.email, phone:newForm.phone, role:'customer', address_json:newForm.city?{city:newForm.city}:{} })
    setSaving(false); setShowAdd(false); setNewForm({full_name:'',email:'',phone:'',city:''}); loadAll()
  }

  function applyFilters(list, filts) {
    if (!filts || filts.length === 0) return list
    return list.filter(function(c) {
      return filts.every(function(f) {
        if (f.field === 'days_since_joined') {
          var days = Math.floor((Date.now() - new Date(c.created_at)) / 86400000)
          if (f.op === 'less_than') return days < parseInt(f.value)
          if (f.op === 'greater_than') return days > parseInt(f.value)
        }
        if (f.field === 'city' && c.address_json) {
          var city = (c.address_json.city||'').toLowerCase()
          if (f.op === 'is') return city === f.value.toLowerCase()
          if (f.op === 'contains') return city.includes(f.value.toLowerCase())
        }
        if (f.field === 'phone') {
          if (f.op === 'is set') return !!c.phone
          if (f.op === 'is not set') return !c.phone
        }
        return true
      })
    })
  }

  function previewSegment() {
    var results = applyFilters(customers, filters)
    setPreviewCount(results.length)
  }

  async function saveSegment() {
    if (!segName.trim()) return
    setSaving(true)
    var results = applyFilters(customers, filters)
    await supabase.from('saved_segments').insert({ name:segName, description:segDesc, filters_json:filters, customer_count:results.length, last_calculated_at:new Date().toISOString() })
    setSaving(false); setShowBuilder(false); setSegName(''); setSegDesc(''); setFilters([{field:'days_since_joined',op:'less_than',value:'30'}]); setPreviewCount(null)
    var r = await supabase.from('saved_segments').select('*').order('created_at',{ascending:false})
    setSavedSegments(r.data||[])
  }

  function openSegment(seg) {
    setActiveSegment(seg)
    var results = applyFilters(customers, seg.filters_json||[])
    setSegCustomers(results)
  }

  function openPreset(preset) {
    var results = applyFilters(customers, preset.filters)
    setActiveSegment({ name:preset.name, description:preset.desc, filters_json:preset.filters, customer_count:results.length })
    setSegCustomers(results)
  }

  function exportCSV(list) {
    var rows = [['Name','Email','Phone','City','Joined']]
    list.forEach(function(c){ rows.push([c.full_name||'',c.email||'',c.phone||'',(c.address_json&&c.address_json.city)||'',c.created_at?c.created_at.substring(0,10):'']) })
    var csv = rows.map(function(r){return r.join(',')}).join('\n')
    var blob = new Blob([csv],{type:'text/csv'}); var url = URL.createObjectURL(blob)
    var a = document.createElement('a'); a.href=url; a.download='customers.csv'; a.click()
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { padding:'8px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', fontFamily:'inherit' }

  function tabStyle(t) {
    return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' }
  }

  // --- SEGMENT DETAIL VIEW ---
  if (activeSegment) {
    var initials = function(name){ return (name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2) }
    return (
      <AdminLayout active="customers">
        <div style={{ padding:'1.5rem 2rem' }}>
          <button onClick={function(){setActiveSegment(null);setSegCustomers([])}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to segments</button>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
            <div>
              <div style={{ fontSize:'22px', fontWeight:700 }}>{activeSegment.name}</div>
              <div style={{ fontSize:'13px', color:'#888' }}>{segCustomers.length} customers{activeSegment.description?' · '+activeSegment.description:''}</div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){exportCSV(segCustomers)}}>⬇ Export CSV</button>
              <button style={btnGold}>✉ Email segment</button>
            </div>
          </div>
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Customer','Email','Phone','City','Joined'].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
              </tr></thead>
              <tbody>
                {segCustomers.length===0 && <tr><td colSpan="5" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No customers match this segment.</td></tr>}
                {segCustomers.map(function(c,i) {
                  return <tr key={c.id} style={{ borderBottom:i<segCustomers.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700 }}>{initials(c.full_name)}</div>
                        <span style={{ fontWeight:500 }}>{c.full_name||'—'}</span>
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{c.email}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{c.phone||'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{(c.address_json&&c.address_json.city)||'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{c.created_at?c.created_at.substring(0,10):'—'}</td>
                  </tr>
                })}
              </tbody>
            </table>
          </div>
        </div>
      </AdminLayout>
    )
  }

  // --- CUSTOMER PROFILE VIEW ---
  if (activeCustomer) {
    var c = activeCustomer
    var ini = (c.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
    return (
      <AdminLayout active="customers">
        <div style={{ padding:'1.5rem 2rem' }}>
          <button onClick={function(){setActiveCustomer(null)}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to customers</button>
          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'1.5rem', flexWrap:'wrap' }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:700 }}>{ini}</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:'20px', fontWeight:700 }}>{c.full_name}</div>
              <div style={{ fontSize:'13px', color:'#888', marginTop:'2px' }}>{c.email}</div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){window.location.href='mailto:'+c.email}}>✉ Email</button>
              <button style={btnGold}>Edit profile</button>
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Contact details</div>
              {[['Email',c.email],['Phone',c.phone||'—'],['City',(c.address_json&&c.address_json.city)||'—'],['Joined',c.created_at?c.created_at.substring(0,10):'—']].map(function(row,i){
                return <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'13px' }}><div style={{ color:'#888', width:'80px' }}>{row[0]}</div><div>{row[1]}</div></div>
              })}
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Booking history</div>
              <div style={{ fontSize:'13px', color:'#888', textAlign:'center', padding:'1rem 0' }}>Booking history loads here once the customer has made bookings.</div>
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout active="customers">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Customers</div>
            <div style={{ fontSize:'13px', color:'#888' }}>{customers.length} total</div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            {tab === 'list' && <><button style={btn} onClick={function(){exportCSV(filtered)}}>⬇ Export CSV</button><button style={btnGold} onClick={function(){setShowAdd(function(v){return !v})}}>+ Add customer</button></>}
            {tab === 'segments' && <button style={btnGold} onClick={function(){setShowBuilder(function(x){return !x})}}>+ Build segment</button>}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem' }}>
          <button style={tabStyle('list')} onClick={function(){setTab('list')}}>👥 All customers</button>
          <button style={tabStyle('segments')} onClick={function(){setTab('segments')}}>🎚 Segments</button>
        </div>

        {/* ===== LIST TAB ===== */}
        {tab === 'list' && (
          <div>
            {showAdd && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', marginBottom:'1rem' }}>
                <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Add new customer</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                  {[['Full name','full_name','Sarah Thompson'],['Email','email','sarah@email.com'],['Phone','phone','(555) 000-0000'],['City','city','Richmond, CA']].map(function(f){
                    return <div key={f[1]}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>{f[0]}</div><input type="text" style={inp} placeholder={f[2]} value={newForm[f[1]]} onChange={function(e){setNewForm(function(prev){var n={...prev};n[f[1]]=e.target.value;return n})}} /></div>
                  })}
                </div>
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setShowAdd(false)}}>Cancel</button>
                  <button style={btnGold} onClick={saveCustomer} disabled={saving}>{saving?'Saving...':'Save customer'}</button>
                </div>
              </div>
            )}

            {selected.size > 0 && (
              <div style={{ background:'#F5E6C0', border:'0.5px solid #D4A843', borderRadius:'10px', padding:'10px 16px', display:'flex', alignItems:'center', gap:'10px', marginBottom:'1rem' }}>
                <span style={{ fontSize:'13px', fontWeight:600 }}>{selected.size} selected</span>
                <div style={{ flex:1 }} />
                <button style={btn} onClick={function(){alert('Opens email composer')}}>✉ Email</button>
                <button style={btn} onClick={function(){exportCSV(filtered.filter(function(c){return selected.has(c.id)}))}}>⬇ Export</button>
                <button style={{ ...btn, color:'#A32D2D' }} onClick={function(){setSelected(new Set())}}>✕ Clear</button>
              </div>
            )}

            <div style={{ position:'relative', marginBottom:'1rem' }}>
              <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#999', fontSize:'15px' }}>⌕</span>
              <input type="text" style={{ ...inp, paddingLeft:'32px' }} placeholder="Search by name, email, phone..." value={search} onChange={function(e){setSearch(e.target.value)}} />
            </div>

            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ background:'#f9f9f7' }}>
                  <th style={{ padding:'10px 14px', width:'36px', borderBottom:'0.5px solid rgba(0,0,0,0.08)' }}>
                    <input type="checkbox" onChange={function(e){if(e.target.checked)setSelected(new Set(filtered.map(function(c){return c.id})));else setSelected(new Set())}} />
                  </th>
                  {['Customer','Phone','City','Joined',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)' }}>{h}</th>})}
                </tr></thead>
                <tbody>
                  {loading && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                  {!loading && filtered.length===0 && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No customers found</td></tr>}
                  {filtered.map(function(c,i) {
                    var ini = (c.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                    var isSelected = selected.has(c.id)
                    return (
                      <tr key={c.id} style={{ background:isSelected?'#FFFBF0':'transparent', borderBottom:i<filtered.length-1?'0.5px solid rgba(0,0,0,0.05)':'none', cursor:'pointer' }} onClick={function(){setActiveCustomer(c)}}>
                        <td style={{ padding:'10px 14px' }} onClick={function(e){e.stopPropagation();var n=new Set(selected);if(n.has(c.id))n.delete(c.id);else n.add(c.id);setSelected(n)}}>
                          <input type="checkbox" checked={isSelected} onChange={function(){}} />
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                            <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, flexShrink:0 }}>{ini}</div>
                            <div><div style={{ fontWeight:500 }}>{c.full_name||'—'}</div><div style={{ fontSize:'11px', color:'#888' }}>{c.email}</div></div>
                          </div>
                        </td>
                        <td style={{ padding:'10px 14px', color:'#666' }}>{c.phone||'—'}</td>
                        <td style={{ padding:'10px 14px', color:'#666' }}>{(c.address_json&&c.address_json.city)||'—'}</td>
                        <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{c.created_at?c.created_at.substring(0,10):'—'}</td>
                        <td style={{ padding:'10px 14px' }} onClick={function(e){e.stopPropagation()}}>
                          <button style={{ ...btn, fontSize:'12px', padding:'4px 10px' }} onClick={function(){setActiveCustomer(c)}}>View</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== SEGMENTS TAB ===== */}
        {tab === 'segments' && (
          <div>
            {/* Segment builder */}
            {showBuilder && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
                <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Build a segment</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'1rem' }}>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Segment name</div><input type="text" style={inp} value={segName} onChange={function(e){setSegName(e.target.value)}} placeholder="e.g. Active Adults 30-50" /></div>
                  <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description (optional)</div><input type="text" style={inp} value={segDesc} onChange={function(e){setSegDesc(e.target.value)}} placeholder="Brief description..." /></div>
                </div>
                <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'8px' }}>Filters <span style={{ color:'#888', fontWeight:400 }}>(all conditions must match)</span></div>
                <div style={{ display:'grid', gap:'8px', marginBottom:'12px' }}>
                  {filters.map(function(f,i) {
                    var ft = FILTER_TYPES.find(function(t){return t.value===f.field})||FILTER_TYPES[0]
                    return (
                      <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', background:'#f9f9f7', padding:'10px 12px', borderRadius:'8px' }}>
                        <select style={{ ...sel, flex:'0 0 180px' }} value={f.field} onChange={function(e){setFilters(function(p){return p.map(function(ff,idx){return idx===i?{...ff,field:e.target.value,op:FILTER_TYPES.find(function(t){return t.value===e.target.value}).ops[0],value:''}:ff})})}}>
                          {FILTER_TYPES.map(function(t){ return <option key={t.value} value={t.value}>{t.label}</option> })}
                        </select>
                        <select style={{ ...sel, flex:'0 0 160px' }} value={f.op} onChange={function(e){setFilters(function(p){return p.map(function(ff,idx){return idx===i?{...ff,op:e.target.value}:ff})})}}>
                          {ft.ops.map(function(o){ return <option key={o} value={o}>{o}</option> })}
                        </select>
                        {f.field==='tag' ? (
                          <select style={{ ...sel, flex:1 }} value={f.value} onChange={function(e){setFilters(function(p){return p.map(function(ff,idx){return idx===i?{...ff,value:e.target.value}:ff})})}}>
                            <option value="">Select tag...</option>
                            {tags.map(function(t){ return <option key={t.id} value={t.name}>{t.name}</option> })}
                          </select>
                        ) : (f.field==='phone') ? (
                          <div style={{ flex:1, fontSize:'13px', color:'#aaa' }}>no value needed</div>
                        ) : (
                          <input type="text" style={{ ...inp, flex:1 }} value={f.value} onChange={function(e){var v=e.target.value;setFilters(function(p){return p.map(function(ff,idx){return idx===i?{...ff,value:v}:ff})})}} placeholder="value..." />
                        )}
                        {filters.length > 1 && <button onClick={function(){setFilters(function(p){return p.filter(function(_,idx){return idx!==i})})}} style={{ ...btn, padding:'5px 10px', color:'#A32D2D' }}>✕</button>}
                      </div>
                    )
                  })}
                </div>
                <div style={{ display:'flex', gap:'8px', marginBottom:'12px' }}>
                  <button style={btn} onClick={function(){setFilters(function(p){return [...p,{field:'days_since_joined',op:'less_than',value:'30'}]})}}>+ Add filter</button>
                  <button style={{ ...btn, color:'#185FA5' }} onClick={previewSegment}>👁 Preview results</button>
                </div>
                {previewCount !== null && (
                  <div style={{ background:'#E6F1FB', border:'0.5px solid #85B7EB', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#185FA5', marginBottom:'12px' }}>
                    <strong>{previewCount} customers</strong> match these filters out of {customers.length} total.
                  </div>
                )}
                <div style={{ display:'flex', gap:'8px' }}>
                  <button style={btn} onClick={function(){setShowBuilder(false)}}>Cancel</button>
                  <button style={btnGold} onClick={saveSegment} disabled={saving||!segName}>{saving?'Saving...':'Save segment'}</button>
                </div>
              </div>
            )}

            {/* Preset quick segments */}
            <div style={{ fontSize:'11px', fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Quick segments</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(190px,1fr))', gap:'10px', marginBottom:'1.5rem' }}>
              {PRESET_SEGMENTS.map(function(p) {
                var count = applyFilters(customers, p.filters).length
                return (
                  <div key={p.name} onClick={function(){openPreset(p)}} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'1rem', cursor:'pointer' }}>
                    <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:p.color, marginBottom:'8px' }}></div>
                    <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'3px' }}>{p.name}</div>
                    <div style={{ fontSize:'11px', color:'#888', marginBottom:'8px' }}>{p.desc}</div>
                    <div style={{ fontSize:'13px', fontWeight:800, color:p.color }}>{loading?'…':count}</div>
                    <div style={{ fontSize:'11px', color:'#aaa' }}>customers</div>
                  </div>
                )
              })}
            </div>

            {/* Saved segments */}
            <div style={{ fontSize:'11px', fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>Saved segments</div>
            {savedSegments.length === 0 && !showBuilder && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888', fontSize:'13px' }}>
                No saved segments yet. Use a quick segment above or build a custom one.
              </div>
            )}
            <div style={{ display:'grid', gap:'8px' }}>
              {savedSegments.map(function(seg) {
                var count = applyFilters(customers, seg.filters_json||[]).length
                return (
                  <div key={seg.id} onClick={function(){openSegment(seg)}} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'1rem 1.25rem', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer' }}>
                    <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#D4A843', flexShrink:0 }}></div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:'14px', fontWeight:600 }}>{seg.name}</div>
                      <div style={{ fontSize:'12px', color:'#888' }}>{seg.description||'No description'} · {(seg.filters_json||[]).length} filter{(seg.filters_json||[]).length!==1?'s':''}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontSize:'20px', fontWeight:800, color:'#185FA5' }}>{count}</div>
                      <div style={{ fontSize:'11px', color:'#888' }}>customers</div>
                    </div>
                    <button style={{ ...btn, fontSize:'12px', padding:'5px 10px' }} onClick={function(e){e.stopPropagation();exportCSV(applyFilters(customers,seg.filters_json||[]))}}>⬇ CSV</button>
                    <button style={{ ...btn, fontSize:'12px', padding:'5px 10px', color:'#A32D2D' }} onClick={async function(e){e.stopPropagation();await supabase.from('saved_segments').delete().eq('id',seg.id);setSavedSegments(function(p){return p.filter(function(s){return s.id!==seg.id})})}}>Delete</button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
