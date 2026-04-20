import { useEffect, useState } from 'react'
import AdminLayout from '../../components/admin/AdminLayout'
import { supabase } from '../../lib/supabase'

var PERIODS = [['today','Today'],['week','This week'],['month','This month'],['quarter','Quarter'],['year','This year'],['all','All time']]

function KPI({ label, value, sub, color, loading }) {
  return (
    <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
      <div style={{ fontSize:'11px', color:'#888', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.04em' }}>{label}</div>
      <div style={{ fontSize:'24px', fontWeight:800, color:color||'#1a1a1a' }}>{loading?'…':value}</div>
      {sub && <div style={{ fontSize:'11px', color:'#aaa', marginTop:'3px' }}>{sub}</div>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom:'1.5rem' }}>
      <div style={{ fontSize:'13px', fontWeight:700, color:'#888', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'10px' }}>{title}</div>
      {children}
    </div>
  )
}

export default function Analytics() {
  var [period, setPeriod] = useState('month')
  var [loading, setLoading] = useState(true)
  var [data, setData] = useState({
    // Visits & Attendance
    totalVisits:0, classVisits:0, apptVisits:0, uniqueCustomers:0, noShows:0, cancellations:0,
    // Bookings
    totalBookings:0, newBookings:0, classBookings:0, apptBookings:0, avgClassCapacity:0,
    // Customers
    newCustomers:0, totalCustomers:0, returningCustomers:0, avgVisitsPerCustomer:0,
    // Revenue
    totalRevenue:0, classRevenue:0, apptRevenue:0, addonRevenue:0, refundsIssued:0, discountsUsed:0,
    // Staff & Payouts
    totalPayouts:0, netProfit:0, courtCosts:0,
    // Top performers
    topClasses:[], topServices:[], recentPayments:[],
  })

  useEffect(function(){ loadAll() }, [period])

  async function loadAll() {
    setLoading(true)
    var now = new Date()
    var start = new Date()
    if (period==='today') { start.setHours(0,0,0,0) }
    else if (period==='week') { start.setDate(now.getDate()-now.getDay()); start.setHours(0,0,0,0) }
    else if (period==='month') { start.setDate(1); start.setHours(0,0,0,0) }
    else if (period==='quarter') { start.setMonth(now.getMonth()-3) }
    else if (period==='year') { start.setFullYear(now.getFullYear(),0,1) }
    else { start = new Date(0) }

    var startISO = start.toISOString()

    var [
      custR, newCustR, apptR, enrR, cancelApptR, noShowR,
      revR, classRevR, payoutR, courtR, clsR, svcR, payR
    ] = await Promise.all([
      supabase.from('profiles').select('id',{count:'exact'}).eq('role','customer').eq('is_active',true),
      supabase.from('profiles').select('id',{count:'exact'}).eq('role','customer').gte('created_at',startISO),
      supabase.from('appointments').select('id,amount_paid,status,coach_id',{count:'exact'}).gte('starts_at',startISO),
      supabase.from('enrollments').select('id,amount_paid',{count:'exact'}).gte('created_at',startISO),
      supabase.from('appointments').select('id',{count:'exact'}).eq('status','cancelled').gte('starts_at',startISO),
      supabase.from('appointments').select('id',{count:'exact'}).eq('status','no_show').gte('starts_at',startISO),
      supabase.from('appointments').select('amount_paid').gte('starts_at',startISO).eq('payment_status','paid'),
      supabase.from('enrollments').select('amount_paid').gte('created_at',startISO).eq('payment_status','paid'),
      supabase.from('payout_records').select('total_payout,court_costs').gte('period_start',startISO),
      supabase.from('court_reservations').select('cost_amount').gte('created_at',startISO),
      supabase.from('classes').select('id,name,color').eq('is_active',true).limit(5),
      supabase.from('services').select('id,name,color').eq('is_active',true).limit(5),
      supabase.from('payments').select('id,amount,status,created_at,profiles!payments_customer_id_fkey(full_name)').gte('created_at',startISO).order('created_at',{ascending:false}).limit(8),
    ])

    var apptRev = (revR.data||[]).reduce(function(s,a){return s+(parseFloat(a.amount_paid)||0)},0)
    var classRev = (classRevR.data||[]).reduce(function(s,e){return s+(parseFloat(e.amount_paid)||0)},0)
    var totalPayouts = (payoutR.data||[]).reduce(function(s,p){return s+(parseFloat(p.total_payout)||0)},0)
    var courtCosts = (courtR.data||[]).reduce(function(s,c){return s+(parseFloat(c.cost_amount)||0)},0)
    var totalRev = apptRev + classRev

    setData({
      totalVisits: (apptR.count||0) + (enrR.count||0),
      classVisits: enrR.count||0,
      apptVisits: apptR.count||0,
      uniqueCustomers: newCustR.count||0,
      noShows: noShowR.count||0,
      cancellations: cancelApptR.count||0,
      totalBookings: (apptR.count||0) + (enrR.count||0),
      newBookings: (apptR.count||0) + (enrR.count||0),
      classBookings: enrR.count||0,
      apptBookings: apptR.count||0,
      avgClassCapacity: 0,
      newCustomers: newCustR.count||0,
      totalCustomers: custR.count||0,
      returningCustomers: Math.max(0,(custR.count||0)-(newCustR.count||0)),
      avgVisitsPerCustomer: newCustR.count>0?((apptR.count||0)+(enrR.count||0)/newCustR.count).toFixed(1):0,
      totalRevenue: totalRev,
      classRevenue: classRev,
      apptRevenue: apptRev,
      addonRevenue: 0,
      refundsIssued: 0,
      discountsUsed: 0,
      totalPayouts,
      courtCosts,
      netProfit: totalRev - totalPayouts - courtCosts,
      topClasses: clsR.data||[],
      topServices: svcR.data||[],
      recentPayments: payR.data||[],
    })
    setLoading(false)
  }

  function currency(n){ return '$'+(n||0).toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0}) }

  var btn = { padding:'6px 14px', borderRadius:'20px', fontSize:'12px', cursor:'pointer', fontFamily:'inherit', fontWeight:400 }

  return (
    <AdminLayout active="analytics">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.25rem', flexWrap:'wrap', gap:'10px' }}>
          <div>
            <div style={{ fontSize:'22px', fontWeight:700 }}>Analytics</div>
            <div style={{ fontSize:'13px', color:'#888' }}>Full business performance overview</div>
          </div>
          <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
            {PERIODS.map(function(p){
              var active = period===p[0]
              return <button key={p[0]} onClick={function(){setPeriod(p[0])}} style={{ ...btn, border:'0.5px solid '+(active?'#D4A843':'rgba(0,0,0,0.15)'), background:active?'#D4A843':'transparent', color:active?'#0D0D0D':'#666', fontWeight:active?600:400 }}>{p[1]}</button>
            })}
          </div>
        </div>

        {/* REVENUE */}
        <Section title="Revenue & Sales">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px' }}>
            <KPI label="Total revenue" value={currency(data.totalRevenue)} color="#1D9E75" loading={loading} />
            <KPI label="Appointment revenue" value={currency(data.apptRevenue)} color="#185FA5" loading={loading} />
            <KPI label="Class revenue" value={currency(data.classRevenue)} color="#534AB7" loading={loading} />
            <KPI label="Net profit" value={currency(data.netProfit)} color={data.netProfit>=0?'#1D9E75':'#A32D2D'} sub="After payouts & court costs" loading={loading} />
          </div>
        </Section>

        {/* VISITS */}
        <Section title="Visits & Attendance">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,minmax(0,1fr))', gap:'12px' }}>
            <KPI label="Total visits" value={data.totalVisits} color="#1a1a1a" loading={loading} />
            <KPI label="Class visits" value={data.classVisits} color="#D4A843" loading={loading} />
            <KPI label="Appointment visits" value={data.apptVisits} color="#185FA5" loading={loading} />
            <KPI label="No-shows" value={data.noShows} color="#A32D2D" loading={loading} />
            <KPI label="Cancellations" value={data.cancellations} color="#BA7517" loading={loading} />
          </div>
        </Section>

        {/* CUSTOMERS */}
        <Section title="Customers">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px' }}>
            <KPI label="Total customers" value={data.totalCustomers} color="#185FA5" loading={loading} />
            <KPI label="New customers" value={data.newCustomers} color="#1D9E75" sub="Joined this period" loading={loading} />
            <KPI label="Returning customers" value={data.returningCustomers} color="#534AB7" loading={loading} />
            <KPI label="Avg visits / customer" value={data.avgVisitsPerCustomer} color="#D4A843" loading={loading} />
          </div>
        </Section>

        {/* BOOKINGS */}
        <Section title="Bookings">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,minmax(0,1fr))', gap:'12px' }}>
            <KPI label="Total bookings" value={data.totalBookings} color="#1a1a1a" loading={loading} />
            <KPI label="Class bookings" value={data.classBookings} color="#D4A843" loading={loading} />
            <KPI label="Appointment bookings" value={data.apptBookings} color="#185FA5" loading={loading} />
            <KPI label="Avg class capacity" value={(data.avgClassCapacity||0)+'%'} color="#1D9E75" loading={loading} />
          </div>
        </Section>

        {/* STAFF */}
        <Section title="Staff & Payouts">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,minmax(0,1fr))', gap:'12px' }}>
            <KPI label="Total coach payouts" value={currency(data.totalPayouts)} color="#534AB7" loading={loading} />
            <KPI label="Court costs" value={currency(data.courtCosts)} color="#A32D2D" loading={loading} />
            <KPI label="Net profit after costs" value={currency(data.netProfit)} color={data.netProfit>=0?'#1D9E75':'#A32D2D'} loading={loading} />
          </div>
        </Section>

        {/* Revenue breakdown + Recent payments */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'16px', marginBottom:'1.5rem' }}>
          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.25rem' }}>
            <div style={{ fontSize:'14px', fontWeight:600, marginBottom:'1rem' }}>Revenue breakdown</div>
            {[
              ['Appointment revenue', data.apptRevenue, data.totalRevenue, '#185FA5'],
              ['Class revenue', data.classRevenue, data.totalRevenue, '#D4A843'],
              ['Add-ons', data.addonRevenue, data.totalRevenue, '#534AB7'],
            ].map(function(r,i){
              var pct = data.totalRevenue > 0 ? Math.round((r[1]/data.totalRevenue)*100) : 0
              return (
                <div key={i} style={{ marginBottom:'12px' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:'13px', marginBottom:'5px' }}>
                    <span style={{ color:'#666' }}>{r[0]}</span>
                    <span style={{ fontWeight:600 }}>{currency(r[1])} <span style={{ color:'#aaa', fontWeight:400 }}>({pct}%)</span></span>
                  </div>
                  <div style={{ height:'6px', background:'#f1f1f1', borderRadius:'3px' }}>
                    <div style={{ height:'100%', borderRadius:'3px', background:r[3], width:pct+'%', transition:'width 0.5s' }}></div>
                  </div>
                </div>
              )
            })}
            <div style={{ borderTop:'0.5px solid rgba(0,0,0,0.08)', paddingTop:'10px', display:'flex', justifyContent:'space-between', fontSize:'13px' }}>
              <span style={{ color:'#888' }}>Total</span>
              <span style={{ fontWeight:700, color:'#1D9E75', fontSize:'15px' }}>{currency(data.totalRevenue)}</span>
            </div>
          </div>

          <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', overflow:'hidden' }}>
            <div style={{ padding:'1rem 1.25rem', borderBottom:'0.5px solid rgba(0,0,0,0.06)', fontSize:'14px', fontWeight:600 }}>Recent payments</div>
            {data.recentPayments.length === 0 && <div style={{ padding:'2rem', textAlign:'center', color:'#999', fontSize:'13px' }}>No payments this period.</div>}
            {data.recentPayments.map(function(p,i){
              var cust = p.profiles ? p.profiles.full_name : '—'
              var sc = p.status==='succeeded'?['#E1F5EE','#0F6E56']:['#FAEEDA','#854F0B']
              return (
                <div key={p.id} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 1.25rem', borderBottom:i<data.recentPayments.length-1?'0.5px solid rgba(0,0,0,0.05)':'none', fontSize:'13px' }}>
                  <div style={{ flex:1 }}><div style={{ fontWeight:500 }}>{cust}</div><div style={{ fontSize:'11px', color:'#aaa' }}>{p.created_at?p.created_at.substring(0,10):'—'}</div></div>
                  <div style={{ fontWeight:700, color:'#1D9E75' }}>${parseFloat(p.amount||0).toFixed(2)}</div>
                  <span style={{ display:'inline-block', padding:'2px 7px', borderRadius:'6px', fontSize:'11px', background:sc[0], color:sc[1], fontWeight:500 }}>{p.status}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Export */}
        <div style={{ display:'flex', gap:'10px' }}>
          <button style={{ padding:'8px 16px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', fontFamily:'inherit' }} onClick={function(){
            var rows = [['Metric','Value']]
            rows.push(['Period', period],['Total revenue',currency(data.totalRevenue)],['Total visits',data.totalVisits],['New customers',data.newCustomers],['Total payouts',currency(data.totalPayouts)],['Net profit',currency(data.netProfit)])
            var csv = rows.map(function(r){return r.join(',')}).join('\n')
            var blob = new Blob([csv],{type:'text/csv'}); var url = URL.createObjectURL(blob)
            var a = document.createElement('a'); a.href=url; a.download='hitelite-analytics-'+period+'.csv'; a.click()
          }}>⬇ Export CSV</button>
          <button style={{ padding:'8px 16px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', fontFamily:'inherit' }}>📄 Download PDF report</button>
        </div>
      </div>
    </AdminLayout>
  )
}
