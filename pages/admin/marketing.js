import AdminLayout from '../../components/admin/AdminLayout'
export default function Page() {
  var titles = { marketing:'Marketing', reviews:'Reviews', schedule:'Schedule', waitlist:'Waitlist' }
  var descs = { marketing:'Email campaigns, automation sequences, and lead nurturing.', reviews:'Customer reviews, ratings, and feedback collection.', schedule:'Full calendar view of all classes and appointments.', waitlist:'Customers waiting for class spots or appointment availability.' }
  var title = 'marketing'
  return (
    <AdminLayout active="marketing">
      <div style={{ padding:'1.5rem 2rem' }}>
        <div style={{ fontSize:'22px', fontWeight:700, marginBottom:'4px' }}>{titles[title]}</div>
        <div style={{ fontSize:'13px', color:'#888', marginBottom:'1.5rem' }}>{descs[title]}</div>
        <div style={{ background:'#fff', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'3rem 2rem', textAlign:'center' }}>
          <div style={{ fontSize:'36px', marginBottom:'14px' }}>🚧</div>
          <div style={{ fontSize:'16px', fontWeight:600, marginBottom:'8px' }}>{titles[title]} module</div>
          <div style={{ fontSize:'13px', color:'#888', maxWidth:'400px', margin:'0 auto' }}>{descs[title]}<br /><br />This module is ready to be built out. Tell your developer which features to add first.</div>
        </div>
      </div>
    </AdminLayout>
  )
}
