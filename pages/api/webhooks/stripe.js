import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const config = { api: { bodyParser: false } }

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  const sig = req.headers['stripe-signature']
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  let event
  try {
    const buf = await getRawBody(req)
    event = webhookSecret
      ? stripe.webhooks.constructEvent(buf, sig, webhookSecret)
      : JSON.parse(buf.toString())
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).json({ error: err.message })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object
      const { booking_type, booking_id, customer_id, payment_mode } = session.metadata || {}
      const amountPaid = session.amount_total / 100

      await supabaseAdmin.from('payments').update({ status: 'succeeded', stripe_charge_id: session.payment_intent }).eq('metadata_json->>session_id', session.id)

      if (booking_type === 'appointment' && booking_id) {
        await supabaseAdmin.from('appointments').update({ payment_status: payment_mode === 'deposit' ? 'partial' : 'paid', amount_paid: amountPaid, status: 'confirmed' }).eq('id', booking_id)
      } else if (booking_type === 'enrollment' && booking_id) {
        await supabaseAdmin.from('enrollments').update({ payment_status: 'paid', amount_paid: amountPaid, status: 'enrolled' }).eq('id', booking_id)
      }

      if (customer_id) {
        const loyaltySettings = await supabaseAdmin.from('loyalty_settings').select('is_enabled, earn_rules_json').limit(1).maybeSingle()
        if (loyaltySettings.data && loyaltySettings.data.is_enabled) {
          const rules = loyaltySettings.data.earn_rules_json || []
          const rule = rules.find(r => r.key === (booking_type === 'appointment' ? 'per_appointment' : 'per_class') && r.enabled)
          if (rule) {
            const points = rule.points || 10
            const existing = await supabaseAdmin.from('loyalty_points').select('id, total_points, lifetime_points').eq('customer_id', customer_id).maybeSingle()
            if (existing.data) {
              await supabaseAdmin.from('loyalty_points').update({ total_points: (existing.data.total_points || 0) + points, lifetime_points: (existing.data.lifetime_points || 0) + points }).eq('id', existing.data.id)
            } else {
              const refCode = Math.random().toString(36).substring(2, 10).toUpperCase()
              await supabaseAdmin.from('loyalty_points').insert({ customer_id, total_points: points, lifetime_points: points, referral_code: refCode })
            }
            await supabaseAdmin.from('loyalty_transactions').insert({ customer_id, points, type: 'earn', reason: 'Booking payment', ref_type: booking_type, ref_id: booking_id })
          }
        }
      }
    }

    if (event.type === 'payment_intent.payment_failed') {
      await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('stripe_payment_intent_id', event.data.object.id)
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const sub = event.data.object
      await supabaseAdmin.from('customer_memberships').update({ status: sub.status === 'active' ? 'active' : sub.status, next_billing_at: new Date(sub.current_period_end * 1000).toISOString() }).eq('stripe_subscription_id', sub.id)
    }

    if (event.type === 'customer.subscription.deleted') {
      await supabaseAdmin.from('customer_memberships').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('stripe_subscription_id', event.data.object.id)
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: err.message })
  }
}
