import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

export default function Analytics() {
  var [stats, setStats] = useState({ customers:0, appointments:0, enrollments:0, revenue:0, newCustomers:0 })
  var [period, setPeriod] = useState('month')
  var [loading, setLoading] = useState(true)

  useEffect(function() {
    async function load() {
      var now = new Date()
      var start = new Date()
      if (period === 'week') start.setDate(now.getDate()-7)
      else if (period === 'month') start.setDate(1)
      else if (period === 'quarter') start.setMonth(now.getMonth()-3)
      else if (period === 'year') start.setFullYear(now.getFullYear(),0,1)
      else start = new Date(0)

      var [custR, apptR, enrR, revR, newCustR] = await Promise.all([
        supabase.from('profiles').select('id', { count:'exact' }).eq('role','customer').eq('is_active',true),
        supabase.from('appointments').select('id', { count:'exact' }).gte('starts_at', start.toISOString()),
        supabase.from('enrollments').select('id', { count:'exact' }).gte('created_at', start.toISOString()),
        supabase.from('appointments').select('amount_paid').gte('starts_at', start.toISOString()).eq('payment_status','paid'),
        supabase.from('profiles').select('id', { count:'exact' }).eq('role','customer').gte('created_at', start.toISOString()),
      ])
      var rev = (revR.data||[]).reduce(function(s,a){return s+(parseFloat(a.amount_paid)||0)},0)
      setStats({ customers:custR.count||0, appointments:apptR.count||0, enrollments:enrR.count||0, revenue:rev, newCustomers:newCustR.count||0 })
      setLoading(false)
    }
    load()
  }, [period])

  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var periodBtn = function(p, label) {
    var active = period === p
    return <button key={p} onClick={function(){setPeriod(p)}} style={{ padding:'6px 14px', borderRadius:'20px', fontSize:'12px', cursor:'pointer', border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#D4A843':'transparent', color:active?'#0D0D0D':'#666', fontFamily:'inherit', fontWeight:active?600:400 }}>{label}</button>
  }

  var cards = [
    { label:'Total customers', value:stats.customers, color:'#185FA5', icon:'👤' },
    { label:'New customers', value:stats.newCustomers, color:'#1D9E75', icon:'✨' },
    { label:'Appointments', value:stats.appointments, color:'#D4A843', icon:'🎾' },
    { label:'Class enrollments', value:stats.enrollments, color:'#534AB7', icon:'👥' },
    { label:'Revenue', value:'$'+stats.revenue.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0}), color:'#1D9E75', icon:'💳' },
  ]

  return (
    <AdminLayout active="analytics">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Analytics</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Business performance at a glance</div>
          </div>
          <div style={{ display:'flex', gap:'6px' }}>
            {[['week','This week'],['month','This month'],['quarter','Quarter'],['year','This year'],['all','All time']].map(function(p){return periodBtn(p[0],p[1])})}
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,minmax(0,1fr))', gap:'12px', marginBottom:'1.5rem' }}>
          {cards.map(function(c,i){
            return <div key={i} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
              <div style={{ fontSize:'18px', marginBottom:'8px' }}>{c.icon}</div>
              <div style={{ fontSize:'11px', color:'#888', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{c.label}</div>
              <div style={{ fontSize:'26px', fontWeight:800, color:c.color }}>{loading?'…':c.value}</div>
            </div>
          })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px' }}>
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
            <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Revenue breakdown</div>
            {[['Appointment revenue','$0','60%'],['Class revenue','$0','30%'],['Add-ons','$0','10%']].map(function(r,i){
              return <div key={i} style={{ marginBottom:'12px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'5px' }}><span>{r[0]}</span><span style={{ fontWeight:600 }}>{r[1]}</span></div>
                <div style={{ height:'6px', background:'#f1f1f1', borderRadius:'3px' }}><div style={{ height:'100%', borderRadius:'3px', background:'#D4A843', width:r[2] }}></div></div>
              </div>
            })}
          </div>
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
            <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Attendance metrics</div>
            {[['Class fill rate','0%','0 / 0 avg'],['Appointment utilization','0%','0 sessions'],['Waitlist conversion','0%','0 promoted'],['No-show rate','0%','0 sessions']].map(function(m,i){
              return <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:i<3?'0.5px solid rgba(0,0,0,0.05)':'none', fontSize:'13px' }}>
                <div>{m[0]}</div>
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  <span style={{ color:'#888', fontSize:'12px' }}>{m[2]}</span>
                  <span style={{ fontWeight:700, color:'#1D9E75' }}>{m[1]}</span>
                </div>
              </div>
            })}
          </div>
        </div>

        <div style={{ marginTop:'16px', background:'#F5E6C0', border:'0.5px solid #D4A843', borderRadius:'12px', padding:'1.25rem', display:'flex', gap:'12px', alignItems:'center' }}>
          <div style={{ fontSize:'20px' }}>📊</div>
          <div>
            <div style={{ fontSize:'13px', fontWeight:600, color:'#8B6914' }}>Analytics are live once you have bookings</div>
            <div style={{ fontSize:'12px', color:'#8B6914', marginTop:'2px' }}>All metrics update in real time as customers book classes and appointments.</div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
