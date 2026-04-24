import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var FILTER_TYPES = [
  { value:'role', label:'Customer type', op:['is'] },
  { value:'created_at', label:'Date joined', op:['before','after','between'] },
  { value:'tag', label:'Has tag', op:['has','does not have'] },
  { value:'city', label:'City', op:['is','contains'] },
  { value:'has_booking', label:'Has upcoming booking', op:['is true','is false'] },
  { value:'visit_count', label:'Total visits', op:['greater than','less than','equals'] },
]

var PRESET_SEGMENTS = [
  { name:'All active customers', desc:'Everyone with an active account', filters:[{field:'role',op:'is',value:'customer'}], color:'#185FA5' },
  { name:'New this month', desc:'Signed up in the last 30 days', filters:[{field:'created_at',op:'after',value:'30_days'}], color:'#1D9E75' },
  { name:'VIP members', desc:'Customers tagged as VIP', filters:[{field:'tag',op:'has',value:'VIP'}], color:'#D4A843' },
  { name:'Inactive (30+ days)', desc:'No booking in over 30 days', filters:[{field:'has_booking',op:'is false',value:''}], color:'#BA7517' },
  { name:'Tennis players', desc:'Tagged as Tennis', filters:[{field:'tag',op:'has',value:'Tennis'}], color:'#534AB7' },
  { name:'Pickleball players', desc:'Tagged as Pickleball', filters:[{field:'tag',op:'has',value:'Pickleball'}], color:'#D85A30' },
]

export default function Segments() {
  var [segments, setSegments] = useState([])
  var [customers, setCustomers] = useState([])
  var [tags, setTags] = useState([])
  var [loading, setLoading] = useState(true)
  var [showBuilder, setShowBuilder] = useState(false)
  var [segmentName, setSegmentName] = useState('')
  var [segmentDesc, setSegmentDesc] = useState('')
  var [filters, setFilters] = useState([{ field:'role', op:'is', value:'customer' }])
  var [previewResults, setPreviewResults] = useState(null)
  var [previewing, setPreviewing] = useState(false)
  var [saving, setSaving] = useState(false)
  var [activeSegment, setActiveSegment] = useState(null)
  var [segmentCustomers, setSegmentCustomers] = useState([])

  useEffect(function(){
    async function load(){
      var [segR, custR, tagR] = await Promise.all([
        supabase.from('saved_segments').select('*').order('created_at',{ascending:false}),
        supabase.from('profiles').select('id,full_name,email,phone,created_at,address_json').eq('role','customer').eq('is_active',true).order('full_name'),
        supabase.from('tags').select('id,name,color').eq('type','customer'),
      ])
      setSegments(segR.data||[])
      setCustomers(custR.data||[])
      setTags(tagR.data||[])
      setLoading(false)
    }
    load()
  },[])

  function addFilter(){
    setFilters(function(p){return [...p,{field:'role',op:'is',value:'customer'}]})
  }

  function removeFilter(i){
    setFilters(function(p){return p.filter(function(_,idx){return idx!==i})})
  }

  function setFilterField(i,key,val){
    setFilters(function(p){return p.map(function(f,idx){return idx===i?{...f,[key]:val}:f})})
  }

  async function previewSegment(){
    setPreviewing(true)
    // Apply filters to local customer list (client-side for now)
    var results = applyFilters(customers, filters)
    setPreviewResults(results)
    setPreviewing(false)
  }

  function applyFilters(list, filts){
    return list.filter(function(c){
      return filts.every(function(f){
        if (f.field === 'role') return true // all are customers
        if (f.field === 'created_at') {
          var daysAgo = parseInt(f.value)
          if (f.op === 'after' && !isNaN(daysAgo)) {
            var cutoff = new Date(); cutoff.setDate(cutoff.getDate()-daysAgo)
            return new Date(c.created_at) >= cutoff
          }
        }
        if (f.field === 'city' && c.address_json) {
          var city = (c.address_json.city||'').toLowerCase()
          if (f.op === 'is') return city === f.value.toLowerCase()
          if (f.op === 'contains') return city.includes(f.value.toLowerCase())
        }
        return true
      })
    })
  }

  async function saveSegment(){
    if (!segmentName.trim()) return
    setSaving(true)
    var results = applyFilters(customers, filters)
    await supabase.from('saved_segments').insert({ name:segmentName, description:segmentDesc, filters_json:filters, customer_count:results.length, last_calculated_at:new Date().toISOString() })
    setSaving(false); setShowBuilder(false); setSegmentName(''); setSegmentDesc(''); setFilters([{field:'role',op:'is',value:'customer'}]); setPreviewResults(null)
    var r = await supabase.from('saved_segments').select('*').order('created_at',{ascending:false})
    setSegments(r.data||[])
  }

  function openSegment(seg){
    setActiveSegment(seg)
    var filts = seg.filters_json || []
    var results = applyFilters(customers, filts)
    setSegmentCustomers(results)
  }

  async function savePreset(preset){
    await supabase.from('saved_segments').insert({ name:preset.name, description:preset.desc, filters_json:preset.filters, customer_count:applyFilters(customers,preset.filters).length, last_calculated_at:new Date().toISOString() })
    var r = await supabase.from('saved_segments').select('*').order('created_at',{ascending:false})
    setSegments(r.data||[])
  }

  function exportCSV(list){
    var rows = [['Name','Email','Phone','City','Joined']]
    list.forEach(function(c){ rows.push([c.full_name||'',c.email||'',c.phone||'',(c.address_json&&c.address_json.city)||'',c.created_at?c.created_at.substring(0,10):'']) })
    var csv = rows.map(function(r){return r.join(',')}).join('\n')
    var blob = new Blob([csv],{type:'text/csv'})
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a'); a.href=url; a.download='segment.csv'; a.click()
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', fontFamily:'inherit' }

  if (activeSegment) {
    var initials = function(name){ return (name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2) }
    return (
      <AdminLayout active="customers">
        <div style={{ padding:'1.5rem 2rem' }}>
          <button onClick={function(){setActiveSegment(null);setSegmentCustomers([])}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to segments</button>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
            <div>
              <div style={{ fontSize:'22px', fontWeight:700 }}>{activeSegment.name}</div>
              <div style={{ fontSize:'13px', color:'#888' }}>{segmentCustomers.length} customers · {activeSegment.description}</div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){exportCSV(segmentCustomers)}}>⬇ Export CSV</button>
              <button style={btnGold}>✉ Email this segment</button>
            </div>
          </div>
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
              <thead><tr style={{ background:'#f9f9f7' }}>
                {['Customer','Email','Phone','City','Joined'].map(function(h,i){ return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th> })}
              </tr></thead>
              <tbody>
                {segmentCustomers.length===0 && <tr><td colSpan="5" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No customers match this segment.</td></tr>}
                {segmentCustomers.map(function(c,i){
                  return <tr key={c.id} style={{ borderBottom:i<segmentCustomers.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}>
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

  return (
    <AdminLayout active="customers">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Customer segments</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Filter and save groups of customers for marketing and analysis</div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <a href="/admin/customers" style={{ ...btn, textDecoration:'none' }}>← All customers</a>
            <button style={btnGold} onClick={function(){setShowBuilder(function(x){return !x})}}>+ Build segment</button>
          </div>
        </div>

        {/* Segment builder */}
        {showBuilder && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Segment builder</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'1.25rem' }}>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Segment name</div><input type="text" style={inp} value={segmentName} onChange={function(e){setSegmentName(e.target.value)}} placeholder="e.g. Active Adults 30-50" /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description (optional)</div><input type="text" style={inp} value={segmentDesc} onChange={function(e){setSegmentDesc(e.target.value)}} placeholder="Brief description..." /></div>
            </div>
            <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'10px' }}>Filters <span style={{ color:'#888', fontWeight:400'}}>(all must match)</span></div>
            <div style={{ display:'grid', gap:'8px', marginBottom:'12px' }}>
              {filters.map(function(f,i){
                var ft = FILTER_TYPES.find(function(t){return t.value===f.field})||FILTER_TYPES[0]
                return (
                  <div key={i} style={{ display:'flex', gap:'8px', alignItems:'center', background:'#f9f9f7', padding:'10px 12px', borderRadius:'8px' }}>
                    <select style={{ ...sel, flex:'0 0 180px' }} value={f.field} onChange={function(e){setFilterField(i,'field',e.target.value)}}>
                      {FILTER_TYPES.map(function(t){ return <option key={t.value} value={t.value}>{t.label}</option> })}
                    </select>
                    <select style={{ ...sel, flex:'0 0 140px' }} value={f.op} onChange={function(e){setFilterField(i,'op',e.target.value)}}>
                      {ft.op.map(function(o){ return <option key={o} value={o}>{o}</option> })}
                    </select>
                    {f.field==='tag' ? (
                      <select style={{ ...sel, flex:1 }} value={f.value} onChange={function(e){setFilterField(i,'value',e.target.value)}}>
                        <option value="">Select tag...</option>
                        {tags.map(function(t){ return <option key={t.id} value={t.name}>{t.name}</option> })}
                      </select>
                    ) : f.field==='created_at' ? (
                      <select style={{ ...sel, flex:1 }} value={f.value} onChange={function(e){setFilterField(i,'value',e.target.value)}}>
                        <option value="7">7 days ago</option><option value="14">14 days ago</option><option value="30">30 days ago</option><option value="60">60 days ago</option><option value="90">90 days ago</option><option value="180">6 months ago</option><option value="365">1 year ago</option>
                      </select>
                    ) : f.field==='has_booking' ? (
                      <div style={{ flex:1, fontSize:'13px', color:'#888' }}>No value needed</div>
                    ) : (
                      <input type="text" style={{ ...inp, flex:1 }} value={f.value} onChange={function(e){setFilterField(i,'value',e.target.value)}} placeholder="Value..." />
                    )}
                    {filters.length > 1 && <button onClick={function(){removeFilter(i)}} style={{ ...btn, padding:'5px 10px', color:'#A32D2D', flexShrink:0 }}>✕</button>}
                  </div>
                )
              })}
            </div>
            <div style={{ display:'flex', gap:'8px', marginBottom:'1rem' }}>
              <button style={btn} onClick={addFilter}>+ Add filter</button>
              <button style={{ ...btn, color:'#185FA5' }} onClick={previewSegment} disabled={previewing}>{previewing?'Calculating...':'Preview results'}</button>
            </div>
            {previewResults !== null && (
              <div style={{ background:'#E6F1FB', border:'0.5px solid #85B7EB', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#185FA5', marginBottom:'1rem' }}>
                <strong>{previewResults.length} customers</strong> match these filters.
              </div>
            )}
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowBuilder(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveSegment} disabled={saving||!segmentName}>{saving?'Saving...':'Save segment'}</button>
            </div>
          </div>
        )}

        {/* Preset segments */}
        <div style={{ marginBottom:'1.5rem' }}>
          <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem', color:'#888', textTransform:'uppercase', letterSpacing:'0.05em', fontSize:'11px' }}>Quick segments</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:'10px' }}>
            {PRESET_SEGMENTS.map(function(p){
              var exists = segments.some(function(s){return s.name===p.name})
              var count = applyFilters(customers, p.filters).length
              return (
                <div key={p.name} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'1rem', cursor:'pointer' }} onClick={function(){if(exists){var s=segments.find(function(s){return s.name===p.name});if(s)openSegment(s)}else{savePreset(p)}}}>
                  <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:p.color, marginBottom:'8px' }}></div>
                  <div style={{ fontSize:'13px', fontWeight:600, marginBottom:'3px' }}>{p.name}</div>
                  <div style={{ fontSize:'11px', color:'#888', marginBottom:'8px' }}>{p.desc}</div>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:'12px', fontWeight:700, color:p.color }}>{count} customers</span>
                    {exists ? <span style={{ fontSize:'11px', color:'#888' }}>Saved ✓</span> : <span style={{ fontSize:'11px', color:'#D4A843' }}>Save →</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Saved segments */}
        <div style={{ fontSize:'11px', fontWeight:600, color:'#888', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'1rem' }}>Saved segments</div>
        {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
        {!loading && segments.length===0 && !showBuilder && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#888', fontSize:'13px' }}>
            No saved segments yet. Use a quick segment above or build your own.
          </div>
        )}
        <div style={{ display:'grid', gap:'8px' }}>
          {segments.map(function(seg){
            return (
              <div key={seg.id} onClick={function(){openSegment(seg)}} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'1rem 1.25rem', display:'flex', alignItems:'center', gap:'14px', cursor:'pointer' }}>
                <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:'#D4A843', flexShrink:0 }}></div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'2px' }}>{seg.name}</div>
                  <div style={{ fontSize:'12px', color:'#888' }}>{seg.description||'No description'} · {(seg.filters_json||[]).length} filter{(seg.filters_json||[]).length!==1?'s':''}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:'18px', fontWeight:800, color:'#185FA5' }}>{seg.customer_count||applyFilters(customers,seg.filters_json||[]).length}</div>
                  <div style={{ fontSize:'11px', color:'#888' }}>customers</div>
                </div>
                <button style={{ ...btnGold, fontSize:'12px', padding:'5px 12px' }} onClick={function(e){e.stopPropagation();exportCSV(applyFilters(customers,seg.filters_json||[]))}}>⬇ Export</button>
                <button style={{ ...btn, fontSize:'12px', padding:'5px 10px', color:'#A32D2D' }} onClick={async function(e){e.stopPropagation();await supabase.from('saved_segments').delete().eq('id',seg.id);setSegments(function(p){return p.filter(function(s){return s.id!==seg.id})})}}>Delete</button>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
