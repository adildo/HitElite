import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
var MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
var HOURS = [7,8,9,10,11,12,13,14,15,16,17,18,19,20]

function Badge({type}) {
  var c = {confirmed:['#E1F5EE','#0F6E56'], pending:['#FAEEDA','#854F0B'], cancelled:['#FCEBEB','#A32D2D'], completed:['#EEEDFE','#534AB7']}[type]||['#f1f1f1','#666']
  return <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'6px', fontSize:'11px', background:c[0], color:c[1], fontWeight:500 }}>{type}</span>
}

export default function Appointments() {
  var [tab, setTab] = useState('services')
  var [appointments, setAppointments] = useState([])
  var [services, setServices] = useState([])
  var [coaches, setCoaches] = useState([])
  var [customers, setCustomers] = useState([])
  var [loading, setLoading] = useState(true)
  var [calDate, setCalDate] = useState(new Date())
  var [calView, setCalView] = useState('week')
  var [selectedAppt, setSelectedAppt] = useState(null)
  var [showNew, setShowNew] = useState(false)
  var [selectedService, setSelectedService] = useState(null)
  var [newForm, setNewForm] = useState({ customer_id:'', coach_id:'', starts_at:'', notes:'', total_amount:'' })
  var [saving, setSaving] = useState(false)
  var [qf, setQf] = useState('upcoming')
  var [showCancelled, setShowCancelled] = useState(false)
  var [editAppt, setEditAppt] = useState(null)

  // Service management state
  var [svcInnerTab, setSvcInnerTab] = useState('services')
  var [categories, setCategories] = useState([])
  var [addons, setAddons] = useState([])
  var [showCreateSvc, setShowCreateSvc] = useState(false)
  var [svcSearch, setSvcSearch] = useState('')
  var [newSvc, setNewSvc] = useState({ name:'', description:'', category_id:'', duration_mins:60, price:'', payment_mode:'full', visibility:'public', booking_mode:'instant' })
  var [newCat, setNewCat] = useState('')
  var [newAddon, setNewAddon] = useState({ name:'', price:'', duration_added_mins:0, max_qty:1 })
  var [svcSaving, setSvcSaving] = useState(false)

  useEffect(function(){
    loadAll()
  }, [calDate, calView])

  async function loadAll() {
    setLoading(true)
    var start = getCalStart(); var end = getCalEnd()
    var [apptR, svcR, coachR, custR, catR, addonR] = await Promise.all([
      supabase.from('appointments').select('*, services(name,color,duration_mins), profiles!appointments_customer_id_fkey(full_name,email), profiles!appointments_coach_id_fkey(full_name)').gte('starts_at',start.toISOString()).lte('starts_at',end.toISOString()).order('starts_at'),
      supabase.from('services').select('*').eq('is_active',true).order('name'),
      supabase.from('profiles').select('id,full_name').in('role',['coach','staff']).eq('is_active',true),
      supabase.from('profiles').select('id,full_name,email').eq('role','customer').eq('is_active',true),
      supabase.from('service_categories').select('*').order('display_order'),
      supabase.from('addons').select('*').eq('is_active',true).order('name'),
    ])
    setAppointments(apptR.data||[])
    setServices(svcR.data||[])
    setCoaches(coachR.data||[])
    setCustomers(custR.data||[])
    setCategories(catR.data||[])
    setAddons(addonR.data||[])
    setLoading(false)
  }

  function getCalStart() {
    var d = new Date(calDate)
    if (calView==='day') { d.setHours(0,0,0,0); return d }
    if (calView==='week') { d.setDate(d.getDate()-d.getDay()); d.setHours(0,0,0,0); return d }
    d.setDate(1); d.setHours(0,0,0,0); return d
  }
  function getCalEnd() {
    var d = new Date(calDate)
    if (calView==='day') { d.setHours(23,59,59,999); return d }
    if (calView==='week') { d.setDate(d.getDate()-d.getDay()+6); d.setHours(23,59,59,999); return d }
    d.setMonth(d.getMonth()+1,0); d.setHours(23,59,59,999); return d
  }
  function getWeekDays() {
    var s = new Date(calDate); s.setDate(s.getDate()-s.getDay())
    return Array.from({length:7},function(_,i){var d=new Date(s);d.setDate(d.getDate()+i);return d})
  }
  function fmt(iso){if(!iso)return '—';var d=new Date(iso);var h=d.getHours();var m=d.getMinutes();return(h%12||12)+':'+(m<10?'0'+m:m)+(h<12?'am':'pm')}
  function fmtDate(iso){var d=new Date(iso);return DAYS_SHORT[d.getDay()]+' '+MONTHS[d.getMonth()]+' '+d.getDate()}
  var isToday = function(d){var n=new Date();return d.getDate()===n.getDate()&&d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear()}

  function apptForHourDay(date, hour) {
    return appointments.filter(function(a){
      if (!showCancelled && a.status==='cancelled') return false
      var d=new Date(a.starts_at); return d.getFullYear()===date.getFullYear()&&d.getMonth()===date.getMonth()&&d.getDate()===date.getDate()&&d.getHours()===hour
    })
  }

  var now = new Date()
  var filteredAppts = appointments.filter(function(a){
    if (!showCancelled && a.status==='cancelled') return false
    if (qf==='upcoming') return new Date(a.starts_at)>=now
    if (qf==='past') return new Date(a.starts_at)<now
    if (qf==='pending') return a.status==='pending'
    if (qf==='confirmed') return a.status==='confirmed'
    return true
  })

  async function bookAppointment() {
    if (!selectedService || !newForm.customer_id || !newForm.starts_at) return
    setSaving(true)
    var startDt = new Date(newForm.starts_at)
    var endDt = new Date(startDt.getTime()+(selectedService.duration_mins||60)*60000)
    await supabase.from('appointments').insert({
      customer_id: newForm.customer_id,
      coach_id: newForm.coach_id||null,
      service_id: selectedService.id,
      starts_at: startDt.toISOString(),
      ends_at: endDt.toISOString(),
      total_amount: parseFloat(newForm.total_amount||selectedService.price||0),
      status: 'pending',
      notes: newForm.notes,
    })
    setSaving(false); setShowNew(false); setSelectedService(null)
    setNewForm({ customer_id:'', coach_id:'', starts_at:'', notes:'', total_amount:'' })
    loadAll()
  }

  async function updateApptStatus(id, status) {
    await supabase.from('appointments').update({status}).eq('id',id)
    setAppointments(function(p){return p.map(function(a){return a.id===id?{...a,status}:a})})
    setSelectedAppt(function(p){return p&&p.id===id?{...p,status}:p})
  }

  async function saveEditAppt() {
    await supabase.from('appointments').update({ starts_at:editAppt.starts_at, ends_at:editAppt.ends_at, total_amount:editAppt.total_amount, status:editAppt.status, notes:editAppt.notes }).eq('id',editAppt.id)
    setEditAppt(null); setSelectedAppt(null); loadAll()
  }

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }
  var sel = { padding:'7px 10px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', fontFamily:'inherit' }
  function tabStyle(t){ return { padding:'9px 18px', fontSize:'13px', cursor:'pointer', border:'none', background:'none', fontFamily:'inherit', borderBottom:tab===t?'2px solid #D4A843':'2px solid transparent', color:tab===t?'#D4A843':'#888', fontWeight:tab===t?600:400, marginBottom:'-1px' } }

  var categories = [...new Set(services.map(function(s){return s.category||'Uncategorized'}))]

  return (
    <AdminLayout active="appointments">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Appointments</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Book, manage, and view all sessions</div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px', marginBottom:'1.25rem' }}>
          {[
            ['Total', appointments.length, '#185FA5'],
            ['Pending', appointments.filter(function(a){return a.status==='pending'}).length, '#D4A843'],
            ['Confirmed', appointments.filter(function(a){return a.status==='confirmed'}).length, '#1D9E75'],
            ['Cancelled', appointments.filter(function(a){return a.status==='cancelled'}).length, '#A32D2D'],
          ].map(function(m,i){ return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'12px' }}><div style={{ fontSize:'11px', color:'#888', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{m[0]}</div><div style={{ fontSize:'22px', fontWeight:800, color:m[2] }}>{m[1]}</div></div> })}
        </div>

        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:'1.25rem', overflowX:'auto' }}>
          <button style={tabStyle('services')} onClick={function(){setTab('services')}}>📋 Services</button>
          <button style={tabStyle('list')} onClick={function(){setTab('list')}}>List view</button>
          <button style={tabStyle('calendar')} onClick={function(){setTab('calendar')}}>Calendar</button>
          <button style={tabStyle('requests')} onClick={function(){setTab('requests')}}>Requests</button>
          <button style={tabStyle('waitlist')} onClick={function(){setTab('waitlist')}}>Waitlist</button>
          <button style={tabStyle('recurring')} onClick={function(){setTab('recurring')}}>Recurring</button>
        </div>

        {/* SERVICES TAB — starting point for booking */}
        {tab==='services' && (
          <div>
            {/* Inner tabs: manage vs book */}
            <div style={{ display:'flex', gap:'2px', background:'#fff', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'12px', padding:'5px', marginBottom:'1.25rem', width:'fit-content' }}>
              {[['book','📅 Book appointment'],['services','🔧 Manage services'],['categories','🗂 Categories'],['addons','➕ Add-ons']].map(function(t){
                var active = svcInnerTab===t[0]
                return <button key={t[0]} onClick={function(){setSvcInnerTab(t[0]);setShowCreateSvc(false)}} style={{ padding:'7px 16px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'none', background:active?'#EEEDFE':'transparent', color:active?'#534AB7':'#666', fontWeight:active?600:400, fontFamily:'inherit' }}>{t[1]}</button>
              })}
              {svcInnerTab!=='book' && <button onClick={function(){setShowCreateSvc(function(x){return !x})}} style={{ padding:'7px 16px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'none', background:'#534AB7', color:'#fff', fontWeight:600, fontFamily:'inherit', marginLeft:'4px' }}>+ {svcInnerTab==='services'?'Add service':svcInnerTab==='categories'?'Add category':'Add add-on'}</button>}
            </div>

            {/* CREATE FORMS */}
            {showCreateSvc && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.1)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
                {svcInnerTab==='services' && (
                  <div>
                    <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>Create service</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                      <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Service name</div><input type="text" style={inp} placeholder="e.g. 60-Min Private Tennis Lesson" value={newSvc.name} onChange={function(e){setNewSvc(function(p){return{...p,name:e.target.value}})}}/></div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Price ($)</div><input type="number" style={inp} value={newSvc.price} onChange={function(e){setNewSvc(function(p){return{...p,price:e.target.value}})}} placeholder="80"/></div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Category</div>
                        <select style={{ ...inp, fontFamily:'inherit' }} value={newSvc.category_id} onChange={function(e){setNewSvc(function(p){return{...p,category_id:e.target.value}})}}>
                          <option value="">No category</option>
                          {categories.map(function(c){return <option key={c.id} value={c.id}>{c.name}</option>})}
                        </select>
                      </div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'6px' }}>Duration</div>
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                          {[30,45,60,75,90,120].map(function(d){ var active=newSvc.duration_mins===d; return <button key={d} onClick={function(){setNewSvc(function(p){return{...p,duration_mins:d}})}} style={{ padding:'5px 10px', borderRadius:'6px', border:'0.5px solid '+(active?'#534AB7':'rgba(0,0,0,0.15)'), background:active?'#EEEDFE':'transparent', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', color:active?'#534AB7':'#666', fontWeight:active?600:400 }}>{d}m</button>})}
                        </div>
                      </div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Booking mode</div>
                        <select style={{ ...inp, fontFamily:'inherit' }} value={newSvc.booking_mode} onChange={function(e){setNewSvc(function(p){return{...p,booking_mode:e.target.value}})}}>
                          <option value="instant">Instant book</option><option value="request">Request (requires approval)</option>
                        </select>
                      </div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Visibility</div>
                        <select style={{ ...inp, fontFamily:'inherit' }} value={newSvc.visibility} onChange={function(e){setNewSvc(function(p){return{...p,visibility:e.target.value}})}}>
                          <option value="public">Public</option><option value="private">Private (link only)</option><option value="staff_only">Staff only</option>
                        </select>
                      </div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Payment mode</div>
                        <select style={{ ...inp, fontFamily:'inherit' }} value={newSvc.payment_mode} onChange={function(e){setNewSvc(function(p){return{...p,payment_mode:e.target.value}})}}>
                          <option value="full">Pay full price</option><option value="deposit">Pay deposit</option><option value="card_on_file">Card on file</option><option value="free">Free</option>
                        </select>
                      </div>
                      <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Description</div><textarea style={{ ...inp, resize:'none', height:'70px' }} value={newSvc.description} onChange={function(e){setNewSvc(function(p){return{...p,description:e.target.value}})}} placeholder="Describe this service..."/></div>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <button style={btn} onClick={function(){setShowCreateSvc(false)}}>Cancel</button>
                      <button style={{ ...btnGold, background:'#534AB7', borderColor:'#534AB7' }} onClick={async function(){
                        if (!newSvc.name.trim()) return
                        setSvcSaving(true)
                        await supabase.from('services').insert({ ...newSvc, duration_mins:parseInt(newSvc.duration_mins), price:parseFloat(newSvc.price)||0, is_active:true })
                        setSvcSaving(false); setShowCreateSvc(false)
                        setNewSvc({ name:'', description:'', category_id:'', duration_mins:60, price:'', payment_mode:'full', visibility:'public', booking_mode:'instant' })
                        loadAll()
                      }} disabled={svcSaving}>{svcSaving?'Saving...':'Save service'}</button>
                    </div>
                  </div>
                )}
                {svcInnerTab==='categories' && (
                  <div>
                    <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1rem' }}>Add category</div>
                    <div style={{ marginBottom:'12px' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Category name</div><input type="text" style={inp} value={newCat} onChange={function(e){setNewCat(e.target.value)}} placeholder="e.g. Private Lessons"/></div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <button style={btn} onClick={function(){setShowCreateSvc(false)}}>Cancel</button>
                      <button style={{ ...btnGold, background:'#534AB7', borderColor:'#534AB7' }} onClick={async function(){
                        if (!newCat.trim()) return
                        await supabase.from('service_categories').insert({ name:newCat.trim(), display_order:categories.length })
                        setNewCat(''); setShowCreateSvc(false); loadAll()
                      }}>Save category</button>
                    </div>
                  </div>
                )}
                {svcInnerTab==='addons' && (
                  <div>
                    <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1rem' }}>Add add-on</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                      <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Add-on name</div><input type="text" style={inp} value={newAddon.name} onChange={function(e){setNewAddon(function(p){return{...p,name:e.target.value}})}} placeholder="e.g. Video Analysis"/></div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Price ($)</div><input type="number" style={inp} value={newAddon.price} onChange={function(e){setNewAddon(function(p){return{...p,price:e.target.value}})}} placeholder="20"/></div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Max quantity</div><input type="number" style={inp} value={newAddon.max_qty} onChange={function(e){setNewAddon(function(p){return{...p,max_qty:e.target.value}})}} placeholder="1"/></div>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <button style={btn} onClick={function(){setShowCreateSvc(false)}}>Cancel</button>
                      <button style={{ ...btnGold, background:'#534AB7', borderColor:'#534AB7' }} onClick={async function(){
                        setSvcSaving(true)
                        await supabase.from('addons').insert({ ...newAddon, price:parseFloat(newAddon.price)||0, duration_added_mins:parseInt(newAddon.duration_added_mins)||0, max_qty:parseInt(newAddon.max_qty)||1, is_active:true })
                        setSvcSaving(false); setShowCreateSvc(false)
                        setNewAddon({ name:'', price:'', duration_added_mins:0, max_qty:1 }); loadAll()
                      }} disabled={svcSaving}>{svcSaving?'Saving...':'Save add-on'}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* BOOK TAB — click service to book */}
            {svcInnerTab==='book' && (
              <div>
                {!showNew && <div style={{ background:'#E6F1FB', border:'0.5px solid #85B7EB', borderRadius:'10px', padding:'12px 16px', marginBottom:'1.25rem', fontSize:'13px', color:'#185FA5', display:'flex', gap:'10px', alignItems:'center' }}>
                  <span>💡</span><span>Select a service below to start booking an appointment.</span>
                </div>}
                {showNew && selectedService && (
                  <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1.25rem' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'1.25rem' }}>
                      <button style={{ ...btn, fontSize:'12px', padding:'4px 10px' }} onClick={function(){setShowNew(false);setSelectedService(null)}}>← Back</button>
                      <div style={{ fontSize:'15px', fontWeight:600 }}>Book: {selectedService.name}</div>
                      <span style={{ fontSize:'13px', color:'#1D9E75', fontWeight:600 }}>${parseFloat(selectedService.price||0).toFixed(0)}</span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'12px' }}>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Customer *</div>
                        <select style={{ ...inp, fontFamily:'inherit' }} value={newForm.customer_id} onChange={function(e){setNewForm(function(p){return{...p,customer_id:e.target.value}})}}>
                          <option value="">Select customer...</option>
                          {customers.map(function(c){return <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>})}
                        </select>
                      </div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Coach</div>
                        <select style={{ ...inp, fontFamily:'inherit' }} value={newForm.coach_id} onChange={function(e){setNewForm(function(p){return{...p,coach_id:e.target.value}})}}>
                          <option value="">Any coach</option>
                          {coaches.map(function(c){return <option key={c.id} value={c.id}>{c.full_name}</option>})}
                        </select>
                      </div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Date & time *</div><input type="datetime-local" style={inp} value={newForm.starts_at} onChange={function(e){setNewForm(function(p){return{...p,starts_at:e.target.value}})}}/></div>
                      <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Amount ($)</div><input type="number" style={inp} value={newForm.total_amount||selectedService.price} onChange={function(e){setNewForm(function(p){return{...p,total_amount:e.target.value}})}}/></div>
                      <div style={{ gridColumn:'span 2' }}><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Notes</div><textarea style={{ ...inp, resize:'none', height:'60px' }} value={newForm.notes} onChange={function(e){setNewForm(function(p){return{...p,notes:e.target.value}})}}/></div>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <button style={btn} onClick={function(){setShowNew(false);setSelectedService(null)}}>Cancel</button>
                      <button style={btnGold} onClick={bookAppointment} disabled={saving||!newForm.customer_id||!newForm.starts_at}>{saving?'Booking...':'Confirm booking'}</button>
                    </div>
                  </div>
                )}
                {!showNew && services.length===0 && <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888' }}>No services yet. Go to "Manage services" tab to add one.</div>}
                {!showNew && (function(){
                  var grouped = {}
                  services.forEach(function(s){ var cat = s.service_categories?.name||'Other'; if(!grouped[cat]) grouped[cat]=[]; grouped[cat].push(s) })
                  return Object.keys(grouped).map(function(cat){
                    return (
                      <div key={cat} style={{ marginBottom:'1.25rem' }}>
                        <div style={{ fontSize:'11px', fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'8px' }}>{cat}</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:'10px' }}>
                          {grouped[cat].map(function(svc){
                            var modeColor = svc.booking_mode==='request'?['#FAEEDA','#854F0B']:['#E1F5EE','#0F6E56']
                            return (
                              <div key={svc.id} onClick={function(){setSelectedService(svc);setShowNew(true);setNewForm({ customer_id:'', coach_id:'', starts_at:'', notes:'', total_amount:svc.price||'' })}}
                                style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem', cursor:'pointer', display:'flex', gap:'12px', alignItems:'flex-start' }}>
                                <div style={{ width:'10px', height:'10px', borderRadius:'50%', background:svc.color||'#534AB7', flexShrink:0, marginTop:'4px' }}></div>
                                <div style={{ flex:1 }}>
                                  <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'5px' }}>{svc.name}</div>
                                  <div style={{ fontSize:'12px', color:'#888', display:'flex', gap:'10px', flexWrap:'wrap', marginBottom:'6px' }}>
                                    <span>⏱ {svc.duration_mins}min</span>
                                    <span style={{ color:'#1D9E75', fontWeight:600 }}>${parseFloat(svc.price||0).toFixed(0)}</span>
                                    <span style={{ display:'inline-block', padding:'1px 7px', borderRadius:'5px', fontSize:'11px', background:modeColor[0], color:modeColor[1], fontWeight:500 }}>{svc.booking_mode||'instant'}</span>
                                  </div>
                                  {svc.description&&<div style={{ fontSize:'12px', color:'#aaa' }}>{svc.description.substring(0,80)}{svc.description.length>80?'...':''}</div>}
                                </div>
                                <div style={{ fontSize:'18px', color:'#D4A843' }}>→</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}

            {/* MANAGE SERVICES TAB */}
            {svcInnerTab==='services' && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 14px', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ position:'relative', width:'260px' }}>
                    <span style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#999' }}>⌕</span>
                    <input type="text" style={{ ...inp, paddingLeft:'32px', borderRadius:'20px' }} placeholder="Search services..." value={svcSearch} onChange={function(e){setSvcSearch(e.target.value)}} />
                  </div>
                </div>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                  <thead><tr style={{ background:'#f9f9f7' }}>
                    {['Name','Price','Duration','Category','Booking',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th>})}
                  </tr></thead>
                  <tbody>
                    {loading && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                    {!loading && services.filter(function(s){return !svcSearch||s.name.toLowerCase().includes(svcSearch.toLowerCase())}).length===0 && <tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No services yet. Click "+ Add service" above.</td></tr>}
                    {services.filter(function(s){return !svcSearch||s.name.toLowerCase().includes(svcSearch.toLowerCase())}).map(function(s,i){
                      return (
                        <tr key={s.id} style={{ borderBottom:'0.5px solid rgba(0,0,0,0.05)' }}>
                          <td style={{ padding:'12px 14px' }}><div style={{ fontWeight:500 }}>{s.name}</div><div style={{ fontSize:'11px', color:'#888', marginTop:'2px', maxWidth:'300px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.description}</div></td>
                          <td style={{ padding:'12px 14px', color:'#666' }}>${parseFloat(s.price||0).toFixed(2)}</td>
                          <td style={{ padding:'12px 14px', color:'#666' }}>{s.duration_mins}min</td>
                          <td style={{ padding:'12px 14px', color:'#666' }}>{s.service_categories?.name||'—'}</td>
                          <td style={{ padding:'12px 14px' }}><span style={{ display:'inline-block', padding:'2px 8px', borderRadius:'6px', fontSize:'11px', background:s.booking_mode==='request'?'#FAEEDA':'#E1F5EE', color:s.booking_mode==='request'?'#854F0B':'#0F6E56', fontWeight:500 }}>{s.booking_mode}</span></td>
                          <td style={{ padding:'12px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px', color:'#A32D2D' }} onClick={async function(){if(confirm('Delete this service?')){await supabase.from('services').update({is_active:false}).eq('id',s.id);loadAll()}}}>Delete</button></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* CATEGORIES TAB */}
            {svcInnerTab==='categories' && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                  <thead><tr style={{ background:'#f9f9f7' }}><th style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>Name</th><th style={{ width:'80px', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}></th></tr></thead>
                  <tbody>
                    {categories.map(function(c,i){return <tr key={c.id} style={{ borderBottom:i<categories.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}><td style={{ padding:'12px 14px', fontWeight:500 }}>🗂 {c.name}</td><td style={{ padding:'12px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px', color:'#A32D2D' }} onClick={async function(){if(confirm('Delete category?')){await supabase.from('service_categories').delete().eq('id',c.id);loadAll()}}}>Delete</button></td></tr>})}
                    {!loading && categories.length===0 && <tr><td colSpan="2" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No categories yet</td></tr>}
                  </tbody>
                </table>
              </div>
            )}

            {/* ADD-ONS TAB */}
            {svcInnerTab==='addons' && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                  <thead><tr style={{ background:'#f9f9f7' }}>
                    {['Name','Price','Max qty',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.06)' }}>{h}</th>})}
                  </tr></thead>
                  <tbody>
                    {addons.map(function(a,i){return <tr key={a.id} style={{ borderBottom:i<addons.length-1?'0.5px solid rgba(0,0,0,0.05)':'none' }}><td style={{ padding:'12px 14px', fontWeight:500 }}>{a.name}</td><td style={{ padding:'12px 14px', color:'#666' }}>${parseFloat(a.price||0).toFixed(2)}</td><td style={{ padding:'12px 14px', color:'#666' }}>{a.max_qty}</td><td style={{ padding:'12px 14px' }}><button style={{ ...btn, padding:'4px 10px', fontSize:'12px', color:'#A32D2D' }} onClick={async function(){if(confirm('Delete add-on?')){await supabase.from('addons').update({is_active:false}).eq('id',a.id);loadAll()}}}>Delete</button></td></tr>})}
                    {!loading && addons.length===0 && <tr><td colSpan="4" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No add-ons yet</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* LIST TAB */}
        {tab==='list' && (
          <div>
            <div style={{ display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'1rem' }}>
              {[['all','All'],['upcoming','Upcoming'],['past','Past'],['pending','Pending'],['confirmed','Confirmed']].map(function(f){
                return <button key={f[0]} onClick={function(){setQf(f[0])}} style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12px', cursor:'pointer', border:'0.5px solid '+(qf===f[0]?'#D4A843':'rgba(0,0,0,0.15)'), background:qf===f[0]?'#D4A843':'transparent', color:qf===f[0]?'#0D0D0D':'#666', fontFamily:'inherit', fontWeight:qf===f[0]?600:400 }}>{f[1]}</button>
              })}
              <div style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#888' }}>
                <div onClick={function(){setShowCancelled(function(v){return !v})}} style={{ width:'34px', height:'18px', borderRadius:'9px', background:showCancelled?'#D4A843':'rgba(0,0,0,0.2)', position:'relative', cursor:'pointer', transition:'background .15s' }}>
                  <div style={{ position:'absolute', width:'14px', height:'14px', borderRadius:'50%', background:'#fff', top:'2px', right:showCancelled?'2px':'18px', transition:'right .15s' }}></div>
                </div>
                Show cancelled
              </div>
            </div>
            <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                <thead><tr style={{ background:'#f9f9f7' }}>
                  {['Customer','Service','Date & time','Status','Amount',''].map(function(h,i){return <th key={i} style={{ padding:'10px 14px', textAlign:'left', fontWeight:500, fontSize:'12px', color:'#888', borderBottom:'0.5px solid rgba(0,0,0,0.08)' }}>{h}</th>})}
                </tr></thead>
                <tbody>
                  {loading&&<tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>Loading...</td></tr>}
                  {!loading&&filteredAppts.length===0&&<tr><td colSpan="6" style={{ padding:'2rem', textAlign:'center', color:'#999' }}>No appointments found</td></tr>}
                  {filteredAppts.map(function(a,i){
                    var cust = a.profiles||{}; var svc = a.services||{}
                    var date = fmtDate(a.starts_at); var time = fmt(a.starts_at)
                    return (
                      <tr key={a.id} style={{ opacity:a.status==='cancelled'?0.55:1, borderBottom:i<filteredAppts.length-1?'0.5px solid rgba(0,0,0,0.05)':'none', cursor:'pointer' }} onClick={function(){setSelectedAppt(a)}}>
                        <td style={{ padding:'10px 14px', fontWeight:500 }}>{cust.full_name||'—'}</td>
                        <td style={{ padding:'10px 14px', color:'#666' }}>{svc.name||'—'}</td>
                        <td style={{ padding:'10px 14px', color:'#666', whiteSpace:'nowrap' }}>{date} · {time}</td>
                        <td style={{ padding:'10px 14px' }}><Badge type={a.status} /></td>
                        <td style={{ padding:'10px 14px', fontWeight:600, color:a.payment_status==='paid'?'#1D9E75':'#BA7517' }}>${parseFloat(a.total_amount||0).toFixed(2)}</td>
                        <td style={{ padding:'10px 14px' }}><button style={{ ...btn, padding:'5px 10px', fontSize:'12px' }} onClick={function(e){e.stopPropagation();setEditAppt({...a})}}>Edit</button></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CALENDAR TAB */}
        {tab==='calendar' && (
          <div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'10px', padding:'10px 14px', marginBottom:'1rem' }}>
              <div style={{ display:'flex', gap:'6px' }}>
                <button style={btn} onClick={function(){var d=new Date(calDate);if(calView==='day')d.setDate(d.getDate()-1);else if(calView==='week')d.setDate(d.getDate()-7);else d.setMonth(d.getMonth()-1);setCalDate(d)}}>‹</button>
                <button style={btn} onClick={function(){setCalDate(new Date())}}>Today</button>
                <button style={btn} onClick={function(){var d=new Date(calDate);if(calView==='day')d.setDate(d.getDate()+1);else if(calView==='week')d.setDate(d.getDate()+7);else d.setMonth(d.getMonth()+1);setCalDate(d)}}>›</button>
              </div>
              <div style={{ fontSize:'14px', fontWeight:600 }}>
                {calView==='day'?DAYS_SHORT[calDate.getDay()]+' '+MONTHS[calDate.getMonth()]+' '+calDate.getDate():calView==='week'?(function(){var days=getWeekDays();return MONTHS[days[0].getMonth()]+' '+days[0].getDate()+' – '+days[6].getDate()})():MONTHS[calDate.getMonth()]+' '+calDate.getFullYear()}
              </div>
              <div style={{ display:'flex', gap:'4px' }}>
                {['day','week','month'].map(function(v){return <button key={v} onClick={function(){setCalView(v)}} style={{ ...btn, background:calView===v?'#D4A843':'transparent', color:calView===v?'#0D0D0D':'#666', borderColor:calView===v?'#D4A843':'rgba(0,0,0,0.2)', fontSize:'12px', padding:'5px 12px' }}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>})}
              </div>
            </div>

            {/* Week grid */}
            {calView==='week' && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'auto' }}>
                <div style={{ display:'grid', gridTemplateColumns:'56px repeat(7,1fr)', minWidth:'700px' }}>
                  <div style={{ background:'#f9f9f7', borderBottom:'0.5px solid rgba(0,0,0,0.08)', borderRight:'0.5px solid rgba(0,0,0,0.06)' }}></div>
                  {getWeekDays().map(function(d,i){
                    return <div key={i} style={{ padding:'8px 6px', textAlign:'center', borderBottom:'0.5px solid rgba(0,0,0,0.08)', borderRight:'0.5px solid rgba(0,0,0,0.05)', background:'#f9f9f7' }}>
                      <div style={{ fontSize:'10px', color:'#aaa', textTransform:'uppercase' }}>{DAYS_SHORT[d.getDay()]}</div>
                      <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:isToday(d)?'#D4A843':'transparent', color:isToday(d)?'#0D0D0D':'#1a1a1a', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'14px', fontWeight:700, margin:'3px auto 0' }}>{d.getDate()}</div>
                    </div>
                  })}
                  {HOURS.map(function(hour){
                    var weekDays = getWeekDays()
                    return [
                      <div key={'h'+hour} style={{ padding:'4px 8px', fontSize:'10px', color:'#ccc', textAlign:'right', background:'#f9f9f7', borderRight:'0.5px solid rgba(0,0,0,0.06)', borderBottom:'0.5px solid rgba(0,0,0,0.04)' }}>{hour>12?hour-12:hour}{hour>=12?'pm':'am'}</div>,
                      weekDays.map(function(d,i){
                        var appts = apptForHourDay(d, hour)
                        return <div key={'c'+i} style={{ padding:'2px 4px', minHeight:'44px', borderBottom:'0.5px solid rgba(0,0,0,0.04)', borderRight:'0.5px solid rgba(0,0,0,0.04)', background:isToday(d)?'rgba(212,168,67,0.01)':'transparent' }}>
                          {appts.map(function(a){
                            var svc = a.services||{}; var cust = a.profiles||{}
                            var col = svc.color||'#534AB7'
                            return <div key={a.id} onClick={function(){setSelectedAppt(a)}} style={{ background:col+'22', border:'1px solid '+col+'55', borderRadius:'4px', padding:'2px 5px', marginBottom:'2px', cursor:'pointer', fontSize:'10px', fontWeight:600, color:col, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                              {fmt(a.starts_at)} {svc.name} — {cust.full_name}
                            </div>
                          })}
                        </div>
                      })
                    ]
                  })}
                </div>
              </div>
            )}

            {/* Day grid */}
            {calView==='day' && (
              <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                {HOURS.map(function(hour){
                  var appts = apptForHourDay(calDate, hour)
                  var isNow = new Date().getHours()===hour&&isToday(calDate)
                  return <div key={hour} style={{ display:'grid', gridTemplateColumns:'56px 1fr', borderBottom:'0.5px solid rgba(0,0,0,0.04)' }}>
                    <div style={{ padding:'8px 10px', fontSize:'11px', color:isNow?'#D4A843':'#ccc', textAlign:'right', background:'#f9f9f7', borderRight:'0.5px solid rgba(0,0,0,0.06)', fontWeight:isNow?700:400 }}>{hour>12?hour-12:hour}{hour>=12?'pm':'am'}</div>
                    <div style={{ padding:'4px 8px', minHeight:'50px', background:isNow?'rgba(212,168,67,0.02)':'transparent' }}>
                      {appts.map(function(a){
                        var svc=a.services||{}; var cust=a.profiles||{}; var col=svc.color||'#534AB7'
                        return <div key={a.id} onClick={function(){setSelectedAppt(a)}} style={{ background:col+'22', border:'1px solid '+col+'55', borderRadius:'4px', padding:'3px 8px', marginBottom:'3px', cursor:'pointer', fontSize:'11px', fontWeight:600, color:col }}>
                          {fmt(a.starts_at)} {svc.name||'Appointment'} — {cust.full_name||'—'}
                        </div>
                      })}
                    </div>
                  </div>
                })}
              </div>
            )}
          </div>
        )}

        {/* REQUESTS TAB */}
        {tab==='requests' && (
          <div style={{ display:'grid', gap:'12px' }}>
            {['pending'].map(function(label){
              var items = appointments.filter(function(a){return a.status===label})
              var lc = ['#FAEEDA','#854F0B']
              return (
                <div key={label} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
                  <div style={{ padding:'10px 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', display:'flex', alignItems:'center', gap:'8px', background:'#f9f9f7' }}>
                    <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:'6px', fontSize:'11px', background:lc[0], color:lc[1], fontWeight:500 }}>Pending requests</span>
                    <span style={{ fontSize:'12px', color:'#888' }}>{items.length}</span>
                  </div>
                  {items.length===0&&<div style={{ padding:'1.25rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No pending requests</div>}
                  {items.map(function(a,i){
                    var cust=a.profiles||{}; var svc=a.services||{}
                    var ini=(cust.full_name||'?').split(' ').map(function(n){return n[0]}).join('').substring(0,2)
                    return <div key={a.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 1.25rem', borderBottom:i<items.length-1?'0.5px solid rgba(0,0,0,0.06)':'none' }}>
                      <div style={{ width:'30px', height:'30px', borderRadius:'50%', background:'#F5E6C0', color:'#B8922E', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', fontWeight:700, flexShrink:0 }}>{ini}</div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:'13px', fontWeight:500 }}>{cust.full_name||'—'} — {svc.name||'—'}</div>
                        <div style={{ fontSize:'12px', color:'#888' }}>{fmtDate(a.starts_at)} · {fmt(a.starts_at)}</div>
                      </div>
                      <button style={{ ...btn, background:'#E1F5EE', color:'#0F6E56', borderColor:'#5DCAA5', fontSize:'12px', padding:'5px 12px' }} onClick={function(){updateApptStatus(a.id,'confirmed')}}>Approve</button>
                      <button style={{ ...btn, background:'#FCEBEB', color:'#A32D2D', borderColor:'#F09595', fontSize:'12px', padding:'5px 12px' }} onClick={function(){updateApptStatus(a.id,'cancelled')}}>Decline</button>
                    </div>
                  })}
                </div>
              )
            })}
          </div>
        )}

        {tab==='waitlist'&&<div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888', fontSize:'13px' }}>Waitlist managed from <a href="/admin/waitlist" style={{ color:'#D4A843' }}>the Waitlist tab →</a></div>}
        {tab==='recurring'&&<div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem', textAlign:'center', color:'#888', fontSize:'13px' }}>Recurring appointments managed from <a href="/admin/recurring" style={{ color:'#D4A843' }}>the Recurring tab →</a></div>}

        {/* APPOINTMENT DETAIL MODAL */}
        {selectedAppt && !editAppt && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:'16px', width:'440px', overflow:'hidden' }}>
              <div style={{ padding:'1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.08)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:'15px', fontWeight:700 }}>{selectedAppt.services?selectedAppt.services.name:'Appointment'}</div>
                <button onClick={function(){setSelectedAppt(null)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:'20px', color:'#888' }}>✕</button>
              </div>
              <div style={{ padding:'1.25rem' }}>
                {[['Customer',(selectedAppt.profiles||{}).full_name||'—'],['Service',(selectedAppt.services||{}).name||'—'],['Date',fmtDate(selectedAppt.starts_at)],['Time',fmt(selectedAppt.starts_at)+' – '+fmt(selectedAppt.ends_at)],['Status',selectedAppt.status],['Amount','$'+parseFloat(selectedAppt.total_amount||0).toFixed(2)]].map(function(row,i){
                  return <div key={i} style={{ display:'flex', padding:'8px 0', borderBottom:'0.5px solid rgba(0,0,0,0.05)', fontSize:'13px' }}><div style={{ color:'#888', width:'90px', flexShrink:0 }}>{row[0]}</div><div style={{ fontWeight:500 }}>{row[1]}</div></div>
                })}
                {selectedAppt.notes&&<div style={{ fontSize:'13px', color:'#666', marginTop:'10px', padding:'10px 12px', background:'#f9f9f7', borderRadius:'8px' }}>{selectedAppt.notes}</div>}
                <div style={{ display:'flex', gap:'8px', marginTop:'1.25rem', flexWrap:'wrap' }}>
                  {selectedAppt.status==='pending'&&<button style={{ ...btnGold, fontSize:'12px' }} onClick={function(){updateApptStatus(selectedAppt.id,'confirmed')}}>✓ Confirm</button>}
                  <button style={{ ...btn, fontSize:'12px' }} onClick={function(){setEditAppt({...selectedAppt})}}>✏️ Edit</button>
                  {selectedAppt.status!=='cancelled'&&<button style={{ ...btn, fontSize:'12px', color:'#A32D2D' }} onClick={function(){updateApptStatus(selectedAppt.id,'cancelled');setSelectedAppt(null)}}>🚫 Cancel</button>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* EDIT MODAL */}
        {editAppt && (
          <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', zIndex:200, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ background:'#fff', borderRadius:'16px', width:'480px', padding:'1.5rem' }}>
              <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'1.25rem' }}>Edit appointment</div>
              <div style={{ display:'grid', gap:'12px', marginBottom:'12px' }}>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Start time</div><input type="datetime-local" style={inp} value={editAppt.starts_at?editAppt.starts_at.substring(0,16):''} onChange={function(e){setEditAppt(function(p){return{...p,starts_at:e.target.value+':00.000Z'}})}}/></div>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Status</div>
                  <select style={{ ...inp, fontFamily:'inherit' }} value={editAppt.status} onChange={function(e){setEditAppt(function(p){return{...p,status:e.target.value}})}}>
                    {['pending','confirmed','completed','cancelled'].map(function(s){return <option key={s}>{s}</option>})}
                  </select>
                </div>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Amount ($)</div><input type="number" style={inp} value={editAppt.total_amount||''} onChange={function(e){setEditAppt(function(p){return{...p,total_amount:e.target.value}})}}/></div>
                <div><div style={{ fontSize:'12px', color:'#666', marginBottom:'4px' }}>Notes</div><textarea style={{ ...inp, resize:'none', height:'60px' }} value={editAppt.notes||''} onChange={function(e){setEditAppt(function(p){return{...p,notes:e.target.value}})}}/></div>
              </div>
              <div style={{ display:'flex', gap:'8px' }}>
                <button style={btn} onClick={function(){setEditAppt(null)}}>Cancel</button>
                <button style={btnGold} onClick={saveEditAppt}>Save changes</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
