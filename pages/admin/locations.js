import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var SURFACE_TYPES = ['Hard court','Clay','Grass','Sport tile','Synthetic']
var AMENITIES = ['Parking','Restrooms','Lights','Pro shop','Water fountain','Seating','Locker rooms','Café']

export default function Locations() {
  var [locations, setLocations] = useState([])
  var [loading, setLoading] = useState(true)
  var [showNew, setShowNew] = useState(false)
  var [editingId, setEditingId] = useState(null)
  var [saving, setSaving] = useState(false)
  var [activeLocation, setActiveLocation] = useState(null)
  var [locationStats, setLocationStats] = useState({})
  var [form, setForm] = useState({ name:'', address:'', city:'', state:'', zip:'', indoor:true, surface_type:'Hard court', max_capacity:'', amenities:[], notes:'', is_active:true, is_tbd:false })

  useEffect(function(){ loadLocations() }, [])

  async function loadLocations() {
    setLoading(true)
    var r = await supabase.from('locations').select('*').order('name')
    setLocations(r.data||[])
    setLoading(false)
  }

  async function loadStats(locationId) {
    var now = new Date()
    var monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    var [apptR, sessR] = await Promise.all([
      supabase.from('appointments').select('id,amount_paid,status').eq('location_id',locationId).gte('starts_at',monthStart.toISOString()),
      supabase.from('class_sessions').select('id,enrolled_count,classes(capacity)').eq('location_id',locationId).gte('starts_at',monthStart.toISOString()),
    ])
    var appts = apptR.data||[]
    var sessions = sessR.data||[]
    var rev = appts.reduce(function(s,a){return s+parseFloat(a.amount_paid||0)},0)
    var totalCap = sessions.reduce(function(s,se){return s+(se.classes&&se.classes.capacity||0)},0)
    var totalEnrolled = sessions.reduce(function(s,se){return s+(se.enrolled_count||0)},0)
    setLocationStats(function(p){ return {...p, [locationId]:{ revenue:rev, sessions:sessions.length, appointments:appts.length, utilization:totalCap>0?Math.round(totalEnrolled/totalCap*100):0 }} })
  }

  async function saveLocation() {
    setSaving(true)
    var payload = {
      name:form.name, address:form.address, city:form.city, state:form.state, zip:form.zip,
      indoor:form.indoor, surface_type:form.surface_type, max_capacity:parseInt(form.max_capacity)||null,
      amenities:form.amenities, notes:form.notes, is_active:form.is_active, is_tbd:form.is_tbd
    }
    if (editingId) await supabase.from('locations').update(payload).eq('id',editingId)
    else await supabase.from('locations').insert(payload)
    setSaving(false); setShowNew(false); setEditingId(null)
    setForm({ name:'', address:'', city:'', state:'', zip:'', indoor:true, surface_type:'Hard court', max_capacity:'', amenities:[], notes:'', is_active:true, is_tbd:false })
    loadLocations()
  }

  function toggleAmenity(a) {
    setForm(function(p){ var arr = p.amenities.includes(a) ? p.amenities.filter(function(x){return x!==a}) : [...p.amenities,a]; return {...p,amenities:arr} })
  }

  function editLocation(loc) {
    setForm({ name:loc.name||'', address:loc.address||'', city:loc.city||'', state:loc.state||'', zip:loc.zip||'', indoor:loc.indoor!==false, surface_type:loc.surface_type||'Hard court', max_capacity:loc.max_capacity||'', amenities:loc.amenities||[], notes:loc.notes||'', is_active:loc.is_active!==false, is_tbd:loc.is_tbd||false })
    setEditingId(loc.id); setShowNew(true)
  }

  function openLocation(loc) {
    setActiveLocation(loc)
    if (!locationStats[loc.id]) loadStats(loc.id)
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { ...inp, fontFamily:'inherit' }

  if (activeLocation) {
    var stats = locationStats[activeLocation.id]
    return (
      <AdminLayout active="locations">
        <div style={{ padding:'1.5rem 2rem' }}>
          <button onClick={function(){setActiveLocation(null)}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to locations</button>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
            <div>
              <div style={{ fontSize:'22px', fontWeight:700 }}>{activeLocation.name}</div>
              <div style={{ fontSize:'13px', color:'#888' }}>{activeLocation.address?activeLocation.address+', ':''}{activeLocation.city} · {activeLocation.indoor?'Indoor':'Outdoor'} · {activeLocation.surface_type}</div>
            </div>
            <button style={btn} onClick={function(){editLocation(activeLocation)}}>Edit location</button>
          </div>

          {/* Stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px', marginBottom:'1.5rem' }}>
            {[
              ['Revenue this month', stats?'$'+stats.revenue.toFixed(0):'…', '#1D9E75'],
              ['Sessions this month', stats?stats.sessions.toString():'…', '#D4A843'],
              ['Appointments this month', stats?stats.appointments.toString():'…', '#185FA5'],
              ['Avg class utilization', stats?stats.utilization+'%':'…', '#534AB7'],
            ].map(function(m,i){
              return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'14px' }}>
                <div style={{ fontSize:'11px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{m[0]}</div>
                <div style={{ fontSize:'22px', fontWeight:800, color:m[2] }}>{m[1]}</div>
              </div>
            })}
          </div>

          {/* Details */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Location details</div>
              {[
                ['Address', [activeLocation.address,activeLocation.city,activeLocation.state,activeLocation.zip].filter(Boolean).join(', ')||'—'],
                ['Type', activeLocation.indoor?'Indoor':'Outdoor'],
                ['Surface', activeLocation.surface_type||'—'],
                ['Capacity', activeLocation.max_capacity?activeLocation.max_capacity+' people':'—'],
                ['Status', activeLocation.is_active?'Active':'Inactive'],
              ].map(function(row,i){
                return <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.05)', fontSize:'13px' }}>
                  <div style={{ color:'#888', width:'90px', flexShrink:0 }}>{row[0]}</div>
                  <div style={{ fontWeight:500 }}>{row[1]}</div>
                </div>
              })}
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Amenities</div>
              {(activeLocation.amenities||[]).length === 0 ? (
                <div style={{ fontSize:'13px', color:'#aaa' }}>No amenities listed.</div>
              ) : (
                <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                  {(activeLocation.amenities||[]).map(function(a){ return <span key={a} style={{ display:'inline-block', padding:'4px 12px', borderRadius:'20px', fontSize:'12px', background:'#F5E6C0', color:'#8B6914', fontWeight:500 }}>✓ {a}</span> })}
                </div>
              )}
              {activeLocation.notes && (
                <div style={{ marginTop:'1rem' }}>
                  <div style={{ fontSize:'12px', fontWeight:600, color:'#888', marginBottom:'4px' }}>Notes</div>
                  <div style={{ fontSize:'13px', color:'#444' }}>{activeLocation.notes}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout active="locations">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Locations</div>
            <div style={{ fontSize:'13px', color:'#888' }}>{locations.length} venue{locations.length!==1?'s':''} configured</div>
          </div>
          <button style={btnGold} onClick={function(){setShowNew(function(x){return !x});setEditingId(null);setForm({ name:'', address:'', city:'', state:'', zip:'', indoor:true, surface_type:'Hard court', max_capacity:'', amenities:[], notes:'', is_active:true, is_tbd:false })}}>+ Add location</button>
        </div>

        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>{editingId?'Edit location':'Add new location'}</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div style={{ gridColumn:'span 2' }}>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Location name</div>
                <input type="text" style={inp} value={form.name} onChange={function(e){setForm(function(p){return{...p,name:e.target.value}})}} placeholder="e.g. Court 3 — Main Facility" />
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Street address</div>
                <input type="text" style={inp} value={form.address} onChange={function(e){setForm(function(p){return{...p,address:e.target.value}})}} placeholder="123 Court Drive" />
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>City</div>
                <input type="text" style={inp} value={form.city} onChange={function(e){setForm(function(p){return{...p,city:e.target.value}})}} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <div>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>State</div>
                  <input type="text" style={inp} value={form.state} onChange={function(e){setForm(function(p){return{...p,state:e.target.value}})}} placeholder="CA" />
                </div>
                <div>
                  <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>ZIP</div>
                  <input type="text" style={inp} value={form.zip} onChange={function(e){setForm(function(p){return{...p,zip:e.target.value}})}} />
                </div>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Surface type</div>
                <select style={sel} value={form.surface_type} onChange={function(e){setForm(function(p){return{...p,surface_type:e.target.value}})}}>
                  {SURFACE_TYPES.map(function(s){return <option key={s}>{s}</option>})}
                </select>
              </div>
              <div>
                <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Max capacity</div>
                <input type="number" style={inp} value={form.max_capacity} onChange={function(e){setForm(function(p){return{...p,max_capacity:e.target.value}})}} placeholder="50" />
              </div>
              <div style={{ display:'flex', gap:'12px', alignItems:'center' }}>
                {[['indoor','Indoor'],['is_tbd','TBD / Public Courts'],['is_active','Active']].map(function(f){
                  return (
                    <label key={f[0]} style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'13px', cursor:'pointer' }}>
                      <input type="checkbox" checked={!!form[f[0]]} onChange={function(){setForm(function(p){var n={...p};n[f[0]]=!n[f[0]];return n})}} />
                      {f[1]}
                    </label>
                  )
                })}
              </div>
            </div>
            <div style={{ marginBottom:'12px' }}>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'6px', fontWeight:500 }}>Amenities</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px' }}>
                {AMENITIES.map(function(a){
                  var on = form.amenities.includes(a)
                  return <button key={a} onClick={function(){toggleAmenity(a)}} style={{ padding:'5px 12px', borderRadius:'20px', border:'0.5px solid '+(on?'#D4A843':'rgba(0,0,0,0.15)'), background:on?'#F5E6C0':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:on?'#8B6914':'#666', fontWeight:on?600:400 }}>{on?'✓ ':''}{a}</button>
                })}
              </div>
            </div>
            <div style={{ marginBottom:'12px' }}>
              <div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Internal notes</div>
              <textarea style={{ ...inp, resize:'none', height:'60px' }} value={form.notes} onChange={function(e){setForm(function(p){return{...p,notes:e.target.value}})}} placeholder="e.g. Key code #4521. Lights on timer." />
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false);setEditingId(null)}}>Cancel</button>
              <button style={btnGold} onClick={saveLocation} disabled={saving||!form.name}>{saving?'Saving...':editingId?'Save changes':'Add location'}</button>
            </div>
          </div>
        )}

        {loading && <div style={{ background:'#fff', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>Loading...</div>}
        {!loading && locations.length === 0 && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:'32px', marginBottom:'14px' }}>📍</div>
            <div style={{ fontWeight:600, marginBottom:'6px' }}>No locations yet</div>
            <div style={{ fontSize:'13px', marginBottom:'1.25rem' }}>Add your courts and venues so they can be assigned to classes and appointments.</div>
            <button style={btnGold} onClick={function(){setShowNew(true)}}>+ Add first location</button>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
          {locations.map(function(loc){
            return (
              <div key={loc.id} onClick={function(){openLocation(loc)}} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', cursor:'pointer', opacity:loc.is_active===false?0.55:1 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'8px' }}>
                  <div style={{ fontSize:'14px', fontWeight:600 }}>{loc.name}</div>
                  <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:loc.indoor?'#E6F1FB':'#F1EFE8', color:loc.indoor?'#185FA5':'#5F5E5A', fontWeight:500 }}>{loc.indoor?'Indoor':'Outdoor'}</span>
                </div>
                <div style={{ fontSize:'12px', color:'#888', marginBottom:'8px' }}>{[loc.address,loc.city].filter(Boolean).join(', ')||'No address'}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:'4px', marginBottom:'8px' }}>
                  {loc.surface_type && <span style={{ fontSize:'11px', background:'#F5E6C0', color:'#8B6914', padding:'2px 8px', borderRadius:'6px' }}>{loc.surface_type}</span>}
                  {loc.max_capacity && <span style={{ fontSize:'11px', background:'#f1f1f1', color:'#666', padding:'2px 8px', borderRadius:'6px' }}>Max {loc.max_capacity}</span>}
                </div>
                {(loc.amenities||[]).length > 0 && (
                  <div style={{ fontSize:'11px', color:'#aaa' }}>✓ {loc.amenities.slice(0,3).join(' · ')}{loc.amenities.length>3?' +'+( loc.amenities.length-3)+' more':''}</div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
