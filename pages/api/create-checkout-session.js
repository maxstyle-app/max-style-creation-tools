import Stripe from 'stripe'
import { supabaseAdmin } from '../../lib/supabaseAdmin'

// Using your exact working Stripe key!
const stripe = new Stripe('sk_test_51TiDW3Fjhcru0Y0zNPfIqMNN2B5cRDrwhF54MxpUogbQm2HgPzIPaT3VTb0wD90ExFD4v3x4lEbrXwKdZYmcPSRQ0070vv9YRm')

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const authHeader = req.headers.authorization
    if (!authHeader) return res.status(401).json({ error: 'Missing login token.' })

    const token = authHeader.replace('Bearer ', '')

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    if (userError || !user) return res.status(401).json({ error: 'Invalid login.' })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      client_reference_id: user.id,
      line_items: [
        {
          price: 'price_1TiDvEFjhcru0Y0zr7ERrwxi',
          quantity: 1
        }
      ],
      success_url: 'https://max-style-creation-tools-production.up.railway.app/?success=true',
      cancel_url: 'https://max-style-creation-tools-production.up.railway.app/?canceled=true',
      metadata: {
        user_id: user.id
      }
    })

    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (existingProfile) {
      await supabaseAdmin.from('user_profiles').update({ stripe_checkout_session: session.id }).eq('user_id', user.id)
    } else {
      await supabaseAdmin.from('user_profiles').insert({
        user_id: user.id,
        email: user.email,
        used_this_month: 0,
        usage_month: new Date().toISOString().slice(0, 7),
        is_paid: false,
        stripe_checkout_session: session.id
      })
    }

    return res.status(200).json({ url: session.url })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ error: error.message })
  }
}
