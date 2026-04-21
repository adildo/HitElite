import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { booking_type, booking_id, customer_id, amount, description, success_url, cancel_url, payment_mode, deposit_amount, discount_code } = req.body
  if (!process.env.STRIPE_SECRET_KEY) return res.status(400).json({ error: 'Stripe not configured. Add STRIPE_SECRET_KEY to Vercel environment variables.' })
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  try {
    const profileResult = await supabaseAdmin.from('profiles').select('stripe_customer_id, full_name, email').eq('id', customer_id).single()
    const profile = profileResult.data
    let stripeCustomerId = profile.stripe_customer_id
    if (!stripeCustomerId) {
      const stripeCustomer = await stripe.customers.create({ email: profile.email, name: profile.full_name, metadata: { supabase_id: customer_id } })
      stripeCustomerId = stripeCustomer.id
      await supabaseAdmin.from('profiles').update({ stripe_customer_id: stripeCustomerId }).eq('id', customer_id)
    }
    let discountData = null
    if (discount_code) {
      const dc = await supabaseAdmin.from('discount_codes').select('*').eq('code', discount_code.toUpperCase()).eq('is_active', true).maybeSingle()
      if (dc.data) { discountData = dc.data; await supabaseAdmin.from('discount_codes').update({ uses_count: (dc.data.uses_count || 0) + 1 }).eq('id', dc.data.id) }
    }
    let baseAmount = parseFloat(payment_mode === 'deposit' ? deposit_amount : amount)
    if (discountData) {
      if (discountData.type === 'percentage') baseAmount = baseAmount * (1 - discountData.value / 100)
      else if (discountData.type === 'fixed') baseAmount = Math.max(0, baseAmount - discountData.value)
    }
    const amountCents = Math.round(baseAmount * 100)
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      line_items: [{ price_data: { currency: 'usd', product_data: { name: description || 'Hit Elite Booking' }, unit_amount: amountCents }, quantity: 1 }],
      mode: 'payment',
      success_url: (success_url || process.env.NEXT_PUBLIC_APP_URL + '/portal/bookings') + '?payment=success&session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancel_url || process.env.NEXT_PUBLIC_APP_URL + '/portal/book',
      payment_intent_data: { metadata: { booking_type, booking_id, customer_id } },
      metadata: { booking_type, booking_id, customer_id, payment_mode: payment_mode || 'full' },
      allow_promotion_codes: !discount_code,
    })
    await supabaseAdmin.from('payments').insert({ customer_id, ref_type: booking_type, ref_id: booking_id, amount: baseAmount.toFixed(2), status: 'pending', stripe_payment_intent_id: session.payment_intent, description, metadata_json: { session_id: session.id, payment_mode, discount_code } })
    return res.status(200).json({ url: session.url, session_id: session.id })
  } catch (err) {
    console.error('Stripe checkout error:', err)
    return res.status(500).json({ error: err.message })
  }
}
