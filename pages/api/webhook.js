import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: { bodyParser: false }
}

async function getRawBody(readable) {
  const chunks = []
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

const stripe = new Stripe('sk_test_51TiDW3Fjhcru0Y0zNPfIqMNN2B5cRDrwhF54MxpUogbQm2HgPzIPaT3VTb0wD90ExFD4v3x4lEbrXwKdZYmcPSRQ0070vv9YRm')

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed')

  const rawBody = await getRawBody(req)
  const sig = req.headers['stripe-signature']

  let event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`)
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const userId = session.client_reference_id 

    if (userId) {
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      )

      await supabaseAdmin
        .from('user_profiles')
        .upsert({ 
          user_id: userId, 
          is_paid: true 
        }, { onConflict: 'user_id' })
    }
  }

  res.status(200).json({ received: true })
}
