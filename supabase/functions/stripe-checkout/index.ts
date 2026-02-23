import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import Stripe from 'npm:stripe@17.7.0';
import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

// Use a custom env var for the service key to ensure it's the correct, most recent one.
// The default SUPABASE_SERVICE_ROLE_KEY can sometimes be stale after key rotation.
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const supabaseServiceKey = Deno.env.get('CUSTOM_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

console.log(`Init: Supabase URL is ${supabaseUrl ? 'present' : 'MISSING'}`);
console.log(`Init: Service Role Key is ${supabaseServiceKey ? 'present' : 'MISSING'}`);
if (supabaseServiceKey) console.log(`Init: Key length: ${supabaseServiceKey.length}, Last 5 chars: ${supabaseServiceKey.slice(-5)}`);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});
const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY')!;
console.log('Stripe secret key loaded:', !!stripeSecret, 'Length:', stripeSecret?.length);
const stripe = new Stripe(stripeSecret, {
  appInfo: {
    name: 'Bolt Integration',
    version: '1.0.0',
  },
});

// Helper function to create responses with CORS headers
function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, x-client-info, apikey, Content-Type',
  };

  // For 204 No Content, don't include Content-Type or body
  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}

Deno.serve(async (req) => {
  console.log(`[${req.method}] Request received for: ${req.url}`);

  // Explicitly handle OPTIONS pre-flight request
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS pre-flight request.');
    return corsResponse(null, 204);
  }

  try {
    console.log('Entered main try block.');

    if (req.method !== 'POST') {
      console.log(`Disallowed method: ${req.method}`);
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    let body;
    try {
      body = await req.json();
      console.log('Request body parsed successfully:', body);
    } catch (e: any) {
      console.error('Failed to parse request body as JSON:', e.message);
      return corsResponse({ error: 'Invalid JSON format' }, 400);
    }

    const { price_id, success_url, cancel_url, mode } = body;

    const validationError = validateParameters(
      { price_id, success_url, cancel_url, mode },
      {
        cancel_url: 'string',
        price_id: 'string',
        success_url: 'string',
        mode: { values: ['payment', 'subscription'] },
      },
    );

    if (validationError) {
      console.error('Parameter validation failed:', validationError);
      return corsResponse({ error: validationError }, 400);
    }
    console.log('Parameters validated successfully.');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing Authorization header.');
      return corsResponse({ error: 'Missing Authorization header' }, 401);
    }
    
    const token = authHeader.replace(/^Bearer\s+/i, '').trim().replace(/^"|"$/g, '');
    console.log('Attempting to get user from token...');
    
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser(token);

    if (getUserError) {
      console.error('Supabase auth.getUser failed:', getUserError.message);
      return corsResponse({ error: 'Failed to authenticate user', details: getUserError.message }, 401);
    }

    if (!user) {
      console.error('User not found for the provided token.');
      return corsResponse({ error: 'User not found' }, 404);
    }
    console.log(`User authenticated: ${user.id}`);

    console.log('Checking for existing Stripe customer...');
    const { data: customer, error: getCustomerError } = await supabase
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (getCustomerError) {
      console.error('Failed to query stripe_customers table:', getCustomerError.message);
      return corsResponse({ error: 'Failed to fetch customer information' }, 500);
    }

    let customerId;

    if (!customer || !customer.customer_id) {
      console.log(`No existing customer found for user ${user.id}. Creating a new one.`);
      const newCustomer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id,
        },
      });
      customerId = newCustomer.id;
      console.log(`Created new Stripe customer ${customerId} for user ${user.id}`);

      console.log('Saving new customer mapping to stripe_customers table...');
      const { error: createCustomerError } = await supabase.from('stripe_customers').insert({
        user_id: user.id,
        customer_id: newCustomer.id,
      });

      if (createCustomerError) {
        console.error('Failed to save new customer mapping:', createCustomerError.message);
        // Attempt to clean up Stripe customer if DB insert fails
        await stripe.customers.del(newCustomer.id).catch(delErr => console.error('Cleanup failed: Could not delete Stripe customer', delErr));
        return corsResponse({ error: 'Failed to create customer mapping' }, 500);
      }
      console.log('New customer mapping saved.');

    } else {
      customerId = customer.customer_id;
      console.log(`Found existing Stripe customer: ${customerId}`);
    }

    // Special handling for subscriptions
    if (mode === 'subscription') {
      console.log('Subscription mode detected. Verifying/creating subscription record...');
      const { data: subscription, error: getSubscriptionError } = await supabase
        .from('stripe_subscriptions')
        .select('status')
        .eq('customer_id', customerId)
        .maybeSingle();

      if (getSubscriptionError) {
        console.error('Failed to query stripe_subscriptions table:', getSubscriptionError.message);
        return corsResponse({ error: 'Failed to fetch subscription information' }, 500);
      }

      if (!subscription) {
        console.log('No subscription record found. Creating one.');
        const { error: createSubscriptionError } = await supabase.from('stripe_subscriptions').insert({
          customer_id: customerId,
          status: 'not_started',
        });

        if (createSubscriptionError) {
          console.error('Failed to create new subscription record:', createSubscriptionError.message);
          return corsResponse({ error: 'Unable to save the subscription in the database' }, 500);
        }
        console.log('Subscription record created.');
      } else {
        console.log(`Existing subscription record found with status: ${subscription.status}`);
      }
    }


    console.log(`Creating Stripe Checkout session for customer ${customerId}...`);
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: price_id,
          quantity: 1,
        },
      ],
      mode,
      success_url,
      cancel_url,
    });

    console.log(`Stripe Checkout session created: ${session.id}`);

    return corsResponse({ sessionId: session.id, url: session.url });
  } catch (error: any) {
    console.error(`[FATAL] Unhandled error in main try block: ${error.message}`, error.stack);
    return corsResponse({ error: 'An unexpected error occurred.', details: error.message }, 500);
  }
});

type ExpectedType = 'string' | { values: string[] };
type Expectations<T> = { [K in keyof T]: ExpectedType };

function validateParameters<T extends Record<string, any>>(values: T, expected: Expectations<T>): string | undefined {
  for (const parameter in values) {
    const expectation = expected[parameter];
    const value = values[parameter];

    if (expectation === 'string') {
      if (value == null) {
        return `Missing required parameter ${parameter}`;
      }
      if (typeof value !== 'string') {
        return `Expected parameter ${parameter} to be a string got ${JSON.stringify(value)}`;
      }
    } else {
      if (!expectation.values.includes(value)) {
        return `Expected parameter ${parameter} to be one of ${expectation.values.join(', ')}`;
      }
    }
  }

  return undefined;
}