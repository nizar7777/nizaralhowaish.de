import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  // Only allow POST requests for webhook callbacks
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  try {
    // Parse the webhook payload from SpaceRemit
    const webhookData = await req.json();
    
    console.log('Received SpaceRemit webhook:', JSON.stringify(webhookData, null, 2));

    // Validate webhook data
    if (!webhookData.data || !webhookData.data.id) {
      console.error('Invalid webhook payload:', webhookData);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid webhook payload' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const paymentData = webhookData.data;

    // Log the payment update
    console.log('Payment status update:', {
      payment_id: paymentData.id,
      status: paymentData.status,
      status_tag: paymentData.status_tag,
      amount: paymentData.total_amount,
      currency: paymentData.currency,
      date: paymentData.date
    });

    // Check if this is a completed payment
    const completedStatuses = ['A', 'B', 'D', 'E']; // Acceptable completion statuses
    const isCompleted = completedStatuses.includes(paymentData.status_tag);

    if (isCompleted) {
      console.log(`Payment ${paymentData.id} completed successfully`);
      
      // Here you can add additional logic for completed payments:
      // - Update database records
      // - Send notifications
      // - Trigger order fulfillment
      // - Update customer records
      
      // Example: Send notification email to yourself
      await notifyPaymentReceived(paymentData);
    } else {
      console.log(`Payment ${paymentData.id} status: ${paymentData.status} (${paymentData.status_tag})`);
    }

    // Always respond with success to acknowledge the webhook
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Webhook processed successfully',
      payment_id: paymentData.id,
      processed_at: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    // Return error but don't fail completely
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Webhook processing failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Function to notify about received payments
async function notifyPaymentReceived(paymentData: any) {
  try {
    console.log(`New payment received: $${paymentData.total_amount} ${paymentData.currency}`);
    console.log(`Payment ID: ${paymentData.id}`);
    console.log(`Status: ${paymentData.status}`);
    console.log(`Date: ${paymentData.date}`);
    
    // You can add email notification logic here
    // For example, send yourself an email about the new payment
    
    /*
    const SENDGRID_API_KEY = Netlify.env.get('SENDGRID_API_KEY');
    const NOTIFICATION_EMAIL = Netlify.env.get('NOTIFICATION_EMAIL') || 'nizar@nizaralhowaish.de';
    
    if (SENDGRID_API_KEY) {
      const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: NOTIFICATION_EMAIL }],
              subject: 'New Payment Received - SpaceRemit'
            }
          ],
          from: { email: 'nizar@nizaralhowaish.de' },
          content: [
            {
              type: 'text/html',
              value: `
                <div style="font-family: Arial, sans-serif; max-width: 600px;">
                  <h2 style="color: #667eea;">New Payment Received!</h2>
                  
                  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Payment Details:</h3>
                    <p><strong>Amount:</strong> $${paymentData.total_amount} ${paymentData.currency}</p>
                    <p><strong>Payment ID:</strong> ${paymentData.id}</p>
                    <p><strong>Status:</strong> ${paymentData.status}</p>
                    <p><strong>Date:</strong> ${paymentData.date}</p>
                    <p><strong>Seller Received:</strong> $${paymentData.seller_received_amount}</p>
                    ${paymentData.notes ? `<p><strong>Notes:</strong> ${paymentData.notes}</p>` : ''}
                  </div>
                  
                  <p>Check your SpaceRemit dashboard for more details.</p>
                </div>
              `
            }
          ]
        })
      });
      
      if (emailResponse.ok) {
        console.log('Payment notification email sent successfully');
      } else {
        console.error('Failed to send payment notification email');
      }
    }
    */
    
  } catch (error) {
    console.error('Failed to send payment notification:', error);
  }
}

export const config: Config = {
  path: "/callback"
};
