import AdminLayout from '../../components/admin/AdminLayout'
import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export default function Locations() {
  var [locations, setLocations] = useState([])
  var [loading, setLoading] = useState(true)
  var [showNew, setShowNew] = useState(false)
  var [form, setForm] = useState({ name:'', address:'', city:'', state:'', surface_type:'hard_court', is_indoor:false, capacity:'', notes:'' })
  var [saving, setSaving] = useState(false)

  useEffect(function(){ loadLocs() }, [])

  async function loadLocs() {
    setLoading(true)
    var r = await supabase.from('locations').select('*').eq('is_active', true).order('name')
    setLocations(r.data||[])
    setLoading(false)
  }

  async function saveLoc() {
    setSaving(true)
    await supabase.from('locations').insert({ ...form, capacity: parseInt(form.capacity)||0, is_active:true })
    setSaving(false); setShowNew(false)
    setForm({ name:'', address:'', city:'', state:'', surface_type:'hard_court', is_indoor:false, capacity:'', notes:'' })
    loadLocs()
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  return (
    <AdminLayout active="locations">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div><div style={{ fontSize:'22px', fontWeight:700 }}>Locations</div><div style={{ fontSize:'13px', color:'#888' }}>{locations.length} active courts & venues</div></div>
          <button style={btnGold} onClick={function(){setShowNew(function(x){return !x})}}>+ Add location</button>
        </div>

        {showNew && (
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
            <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Add location</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
              <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Location name</div><input type="text" style={inp} placeholder="e.g. Court 1 — Main Facility" value={form.name} onChange={function(e){setForm(function(p){return{...p,name:e.target.value}})}} /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Address</div><input type="text" style={inp} placeholder="123 Main St" value={form.address} onChange={function(e){setForm(function(p){return{...p,address:e.target.value}})}} /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>City</div><input type="text" style={inp} placeholder="Richmond" value={form.city} onChange={function(e){setForm(function(p){return{...p,city:e.target.value}})}} /></div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Surface type</div>
                <select style={inp} value={form.surface_type} onChange={function(e){setForm(function(p){return{...p,surface_type:e.target.value}})}}>
                  <option value="hard_court">Hard court</option><option value="clay">Clay</option><option value="grass">Grass</option><option value="sport_tile">Sport tile</option><option value="indoor">Indoor</option>
                </select>
              </div>
              <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Max capacity</div><input type="number" style={inp} placeholder="20" value={form.capacity} onChange={function(e){setForm(function(p){return{...p,capacity:e.target.value}})}} /></div>
            </div>
            <div style={{ display:'flex', gap:'8px' }}>
              <button style={btn} onClick={function(){setShowNew(false)}}>Cancel</button>
              <button style={btnGold} onClick={saveLoc} disabled={saving}>{saving?'Saving...':'Save location'}</button>
            </div>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'14px' }}>
          {loading && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px', gridColumn:'span 4' }}>Loading...</div>}
          {!loading && locations.length === 0 && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', gridColumn:'span 4' }}><div style={{ fontSize:'32px', marginBottom:'12px' }}>📍</div><div style={{ fontWeight:600, marginBottom:'6px' }}>No locations yet</div><button style={btnGold} onClick={function(){setShowNew(true)}}>+ Add your first location</button></div>}
          {locations.map(function(loc) {
            return (
              <div key={loc.id} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                  <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#F5E6C0', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>🎾</div>
                  <div style={{ flex:1, minWidth:0 }}><div style={{ fontSize:'14px', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{loc.name}</div><div style={{ fontSize:'12px', color:'#888' }}>{loc.surface_type.replace('_',' ')}</div></div>
                </div>
                {(loc.address||loc.city) && <div style={{ fontSize:'12px', color:'#888', marginBottom:'6px' }}>📍 {[loc.address, loc.city, loc.state].filter(Boolean).join(', ')}</div>}
                {loc.capacity > 0 && <div style={{ fontSize:'12px', color:'#888' }}>👥 Capacity: {loc.capacity}</div>}
                <div style={{ display:'flex', gap:'8px', marginTop:'12px' }}>
                  <button style={{ ...btn, flex:1, fontSize:'12px' }}>Edit</button>
                  <button style={{ ...btn, fontSize:'12px', color:'#A32D2D' }}>Deactivate</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
