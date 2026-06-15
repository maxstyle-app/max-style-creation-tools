import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe('sk_test_51TiDW3Fjhcru0Y0zNPfIqMNN2B5cRDrwhF54MxpUogbQm2HgPzIPaT3VTb0wD90ExFD4v3x4lEbrXwKdZYmcPSRQ0070vv9YRm');

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Tells Next.js not to block the Stripe message
export const config = {
  api: { bodyParser: false },
};

// Reads the Stripe message without needing any external packages!
async function getRawBody(readable) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const rawBody = await getRawBody(req);
    const event = JSON.parse(rawBody.toString('utf-8'));

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.metadata?.user_id || session.client_reference_id;

      if (userId) {
        await supabaseAdmin
          .from('user_profiles')
          .update({ is_paid: true })
          .eq('user_id', userId);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
}
