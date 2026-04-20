import { createClient } from '@supabase/supabase-js'
import { buffer } from 'micro'

export const config = { api: { bodyParser: false } }

var supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  var Stripe = require('stripe')
  var stripe = Stripe(process.env.STRIPE_SECRET_KEY)
  var sig = req.headers['stripe-signature']
  var webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  var event
  try {
    var buf = await buffer(req)
    event = webhookSecret
      ? stripe.webhooks.constructEvent(buf, sig, webhookSecret)
      : JSON.parse(buf.toString())
  } catch (err) {
    console.error('Webhook signature error:', err.message)
    return res.status(400).json({ error: err.message })
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        var session = event.data.object
        var { booking_type, booking_id, customer_id, payment_mode } = session.metadata || {}
        var amountPaid = session.amount_total / 100

        // Update payment record
        await supabaseAdmin.from('payments').update({ status: 'succeeded', stripe_charge_id: session.payment_intent }).eq('metadata_json->>session_id', session.id)

        // Update booking payment status
        if (booking_type === 'appointment' && booking_id) {
          var newStatus = payment_mode === 'deposit' ? 'partial' : 'paid'
          await supabaseAdmin.from('appointments').update({ payment_status: newStatus, amount_paid: amountPaid, status: 'confirmed' }).eq('id', booking_id)
        } else if (booking_type === 'enrollment' && booking_id) {
          await supabaseAdmin.from('enrollments').update({ payment_status: 'paid', amount_paid: amountPaid, status: 'enrolled' }).eq('id', booking_id)
        }

        // Award loyalty points if program enabled
        if (customer_id) {
          var loyaltySettings = await supabaseAdmin.from('loyalty_settings').select('is_enabled, earn_rules_json').limit(1).maybeSingle()
          if (loyaltySettings.data && loyaltySettings.data.is_enabled) {
            var rules = loyaltySettings.data.earn_rules_json || []
            var rule = rules.find(function(r){ return r.key === (booking_type === 'appointment' ? 'per_appointment' : 'per_class') && r.enabled })
            if (rule) {
              var points = rule.points || 10
              var existing = await supabaseAdmin.from('loyalty_points').select('id, total_points, lifetime_points').eq('customer_id', customer_id).maybeSingle()
              if (existing.data) {
                await supabaseAdmin.from('loyalty_points').update({ total_points: (existing.data.total_points||0) + points, lifetime_points: (existing.data.lifetime_points||0) + points }).eq('id', existing.data.id)
              } else {
                var refCode = Math.random().toString(36).substring(2,10).toUpperCase()
                await supabaseAdmin.from('loyalty_points').insert({ customer_id, total_points: points, lifetime_points: points, referral_code: refCode })
              }
              await supabaseAdmin.from('loyalty_transactions').insert({ customer_id, points, type: 'earn', reason: 'Booking payment', ref_type: booking_type, ref_id: booking_id })
            }
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        var pi = event.data.object
        await supabaseAdmin.from('payments').update({ status: 'failed' }).eq('stripe_payment_intent_id', pi.id)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        var sub = event.data.object
        var stripeCustomerId = sub.customer
        var profileResult = await supabaseAdmin.from('profiles').select('id').eq('stripe_customer_id', stripeCustomerId).maybeSingle()
        if (profileResult.data) {
          await supabaseAdmin.from('customer_memberships').update({ status: sub.status === 'active' ? 'active' : sub.status, next_billing_at: new Date(sub.current_period_end * 1000).toISOString() }).eq('stripe_subscription_id', sub.id)
        }
        break
      }

      case 'customer.subscription.deleted': {
        var sub = event.data.object
        await supabaseAdmin.from('customer_memberships').update({ status: 'cancelled', cancelled_at: new Date().toISOString() }).eq('stripe_subscription_id', sub.id)
        break
      }
    }

    return res.status(200).json({ received: true })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return res.status(500).json({ error: err.message })
  }
}
