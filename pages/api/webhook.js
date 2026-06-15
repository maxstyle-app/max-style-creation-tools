import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { buffer } from 'micro';

// 1. Stripe Connection
const stripe = new Stripe('sk_test_51TiDW3Fjhcru0Y0zNPfIqMNN2B5cRDrwhF54MxpUogbQm2HgPzIPaT3VTb0wD90ExFD4v3x4lEbrXwKdZYmcPSRQ0070vv9YRm');

// 2. Direct Database Connection (Bypassing the broken file)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// This tells Next.js not to mess with the Stripe message format
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  const buf = await buffer(req);
  let event;

  try {
    // Read the message from Stripe
    event = JSON.parse(buf.toString());
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // If the checkout was successful, update the database!
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    
    // Get the user's ID that we attached during checkout
    const userId = session.metadata?.user_id || session.client_reference_id;

    if (userId) {
      // Change them from free trial to Paid!
      await supabaseAdmin
        .from('user_profiles')
        .update({ is_paid: true })
        .eq('user_id', userId);
    }
  }

  // Tell Stripe we got the message
  return res.status(200).json({ received: true });
}
