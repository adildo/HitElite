import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Customers() {
  var [customers, setCustomers] = useState([])
  var [filtered, setFiltered] = useState([])
  var [search, setSearch] = useState('')
  var [loading, setLoading] = useState(true)
  var [selected, setSelected] = useState(new Set())
  var [view, setView] = useState('list')
  var [activeCustomer, setActiveCustomer] = useState(null)
  var [showAdd, setShowAdd] = useState(false)
  var [newForm, setNewForm] = useState({ full_name:'', email:'', phone:'', city:'' })
  var [saving, setSaving] = useState(false)

  useEffect(function() { loadCustomers() }, [])

  async function loadCustomers() {
    setLoading(true)
    var result = await supabase.from('profiles').select('id, full_name, email, phone, role, created_at, is_active, address_json').eq('role', 'customer').order('created_at', { ascending: false })
    setCustomers(result.data || [])
    setFiltered(result.data || [])
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
    var passResult = await supabase.auth.admin ? null : null
    var result = await supabase.from('profiles').insert({
      id: crypto.randomUUID(),
      full_name: newForm.full_name,
      email: newForm.email,
      phone: newForm.phone,
      role: 'customer',
      address_json: newForm.city ? { city: newForm.city } : {}
    })
    setSaving(false)
    if (!result.error) {
      setShowAdd(false)
      setNewForm({ full_name:'', email:'', phone:'', city:'' })
      loadCustomers()
    }
  }

  function exportCSV() {
    var rows = [['Name','Email','Phone','City','Joined']]
    filtered.forEach(function(c) {
      rows.push([c.full_name||'', c.email||'', c.phone||'', (c.address_json&&c.address_json.city)||'', c.created_at?c.created_at.substring(0,10):''])
    })
    var csv = rows.map(function(r){return r.join(',')}).join('\n')
    var blob = new Blob([csv], { type:'text/csv' })
    var url = URL.createObjectURL(blob)
    var a = document.createElement('a'); a.href=url; a.download='hit-elite-customers.csv'; a.click()
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  if (view === 'profile' && activeCustomer) {
    var c = activeCustomer
    var initials = (c.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
    return (
      <AdminLayout active="customers">
        <div style={{ padding:'1.5rem 2rem' }}>
          <button onClick={function(){setView('list');setActiveCustomer(null)}} style={{ ...btn, color:'#D4A843', borderColor:'transparent', paddingLeft:0, marginBottom:'1rem' }}>← Back to customers</button>
          <div style={{ display:'flex', alignItems:'center', gap:'16px', marginBottom:'1.5rem', flexWrap:'wrap' }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', fontWeight:700, flexShrink:0 }}>{initials}</div>
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
                return <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'13px' }}><div style={{ color:'#888', width:'100px' }}>{row[0]}</div><div>{row[1]}</div></div>
              })}
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Activity</div>
              <div style={{ fontSize:'13px', color:'#888', textAlign:'center', padding:'1rem 0' }}>Booking history will appear here once integrated with sessions.</div>
            </div>
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
            <div style={{ fontSize:'22px', fontWeight:700 }}>Customers</div>
            <div style={{ fontSize:'13px', color:'#888' }}>{customers.length} total</div>
          </div>
          <div style={{ display:'flex', gap:'8px' }}>
            <button style={btn} onClick={exportCSV}>⬇ Export CSV</button>
            <button style={btnGold} onClick={function(){setShowAdd(function(v){return !v})}}>+ Add customer</button>
          </div>
        </div>

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
            <button style={btn} onClick={exportCSV}>⬇ Export</button>
            <button style={{ ...btn, color:'#A32D2D' }} onClick={function(){setSelected(new Set())}}>✕ Clear</button>
          </div>
        )}

        <div style={{ display:'flex', gap:'8px', marginBottom:'1rem' }}>
          <div style={{ position:'relative', flex:1 }}>
            <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#999', fontSize:'15px', pointerEvents:'none' }}>⌕</span>
            <input type="text" style={{ ...inp, paddingLeft:'32px' }} placeholder="Search by name, email, phone..." value={search} onChange={function(e){setSearch(e.target.value)}} />
          </div>
        </div>

        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
            <thead><tr style={{ background:'#f9f9f7' }}>
              <th style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)', width:'36px' }}>
                <input type="checkbox" onChange={function(e){if(e.target.checked)setSelected(new Set(filtered.map(function(c){return c.id})));else setSelected(new Set())}} />
              </th>
              {['Customer','Phone','City','Joined',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)', whiteSpace:'nowrap' }}>{h}</th>})}
            </tr></thead>
            <tbody>
              {loading && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading customers...</td></tr>}
              {!loading && filtered.length === 0 && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No customers found</td></tr>}
              {filtered.map(function(c, i) {
                var initials = (c.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                var isSelected = selected.has(c.id)
                var city = (c.address_json && c.address_json.city) || '—'
                var joined = c.created_at ? c.created_at.substring(0,10) : '—'
                return (
                  <tr key={c.id} style={{ background:isSelected?'#FFFBF0':'transparent', cursor:'pointer', borderBottom: i<filtered.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }} onClick={function(){setActiveCustomer(c);setView('profile')}}>
                    <td style={{ padding:'10px 14px' }} onClick={function(e){e.stopPropagation();var n=new Set(selected);if(n.has(c.id))n.delete(c.id);else n.add(c.id);setSelected(n)}}>
                      <input type="checkbox" checked={isSelected} onChange={function(){}} />
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                        <div style={{ width:'32px', height:'32px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', fontWeight:700, flexShrink:0 }}>{initials}</div>
                        <div>
                          <div style={{ fontWeight:500 }}>{c.full_name || '—'}</div>
                          <div style={{ fontSize:'11px', color:'#888' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{c.phone||'—'}</td>
                    <td style={{ padding:'10px 14px', color:'#666' }}>{city}</td>
                    <td style={{ padding:'10px 14px', color:'#888', fontSize:'12px' }}>{joined}</td>
                    <td style={{ padding:'10px 14px' }} onClick={function(e){e.stopPropagation()}}>
                      <button style={{ ...btn, fontSize:'12px', padding:'4px 10px' }} onClick={function(){setActiveCustomer(c);setView('profile')}}>View</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AdminLayout>
  )
}
