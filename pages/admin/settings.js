import AdminLayout from '../../components/admin/AdminLayout'

export default function Settings() {
  var btn = { padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'0.5px solid rgba(0,0,0,0.2)', background:'transparent', color:'#1a1a1a', fontFamily:'inherit' }
  var btnGold = { ...btn, background:'#D4A843', color:'#0D0D0D', borderColor:'#D4A843', fontWeight:600 }
  var inp = { width:'100%', padding:'8px 12px', borderRadius:'8px', border:'0.5px solid rgba(0,0,0,0.2)', fontSize:'13px', background:'#fff', color:'#1a1a1a', outline:'none' }

  var sections = [
    { title:'Business info', fields:[['Business name','Hit Elite Tennis & Pickleball'],['Contact email','admin@hitelite.com'],['Phone','(555) 000-0000'],['Address','123 Court Drive, Richmond CA']] },
    { title:'Booking settings', fields:[['Default session duration (min)','60'],['Advance booking window (days)','30'],['Cancellation notice required (hours)','24']] },
  ]

  return (
    <AdminLayout active="settings">
      <div style={{ padding:'1.5rem 2rem', maxWidth:'720px' }}>
        <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'1.5rem' }}>Settings</div>
        {sections.map(function(sec,si){
          return (
            <div key={si} style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
              <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'1.25rem' }}>{sec.title}</div>
              <div style={{ display:'grid', gap:'12px' }}>
                {sec.fields.map(function(f,i){
                  return <div key={i} style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', alignItems:'center' }}>
                    <label style={{ fontSize:'13px', color:'#666' }}>{f[0]}</label>
                    <input type="text" style={inp} defaultValue={f[1]} />
                  </div>
                })}
              </div>
              <button style={{ ...btnGold, marginTop:'1rem' }}>Save changes</button>
            </div>
          )
        })}

        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'1.5rem', marginBottom:'1rem' }}>
          <div style={{ fontSize:'15px', fontWeight:600, marginBottom:'4px' }}>Integrations</div>
          <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.25rem' }}>Connect your third-party tools</div>
          {[['Stripe','Payment processing','Connect Stripe'],['SendGrid','Email notifications','Configure'],['Twilio','SMS notifications','Configure'],['Google Calendar','Coach calendar sync','Connect']].map(function(intg,i){
            return <div key={i} style={{ display:'flex', alignItems:'center', gap:'12px', padding:'12px 0', borderBottom:i<3?'0.5px solid rgba(0,0,0,0.06)':'none' }}>
              <div style={{ width:'36px', height:'36px', borderRadius:'8px', background:'#f5f5f3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'18px', flexShrink:0 }}>🔌</div>
              <div style={{ flex:1 }}><div style={{ fontSize:'13px', fontWeight:500 }}>{intg[0]}</div><div style={{ fontSize:'12px', color:'#888' }}>{intg[1]}</div></div>
              <button style={btn}>{intg[2]}</button>
            </div>
          })}
        </div>
      </div>
    </AdminLayout>
  )
}
