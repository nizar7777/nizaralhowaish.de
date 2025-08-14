import type { Context, Config } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
      }
    });
  }

  try {
    // Parse request body
    const body = await req.json();
    const { payment_id, customer_email, hours, project_details } = body;

    // Validate required fields
    if (!payment_id) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment ID is required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get SpaceRemit private key from environment variables
    const SPACEREMIT_PRIVATE_KEY = Netlify.env.get('SPACEREMIT_PRIVATE_KEY') || 
                                   Netlify.env.get('SPACEREMIT_TEST_PRIVATE_KEY') ||
                                   'test_skCZYMU2ZJL58A7E011B0VJY7I5GXLV0KP4DPRMUVTWX5QQGSW10';
    
    if (!SPACEREMIT_PRIVATE_KEY) {
      console.error('SpaceRemit private key not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment verification service not configured' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Verifying payment:', payment_id);
    console.log('Using private key:', SPACEREMIT_PRIVATE_KEY.substring(0, 10) + '...');

    // Verify payment with SpaceRemit API
    const verificationResponse = await fetch('https://spaceremit.com/api/v2/payment_info/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        private_key: SPACEREMIT_PRIVATE_KEY,
        payment_id: payment_id
      })
    });

    const verificationData = await verificationResponse.json();
    console.log('SpaceRemit response:', verificationData);

    // Check if verification was successful
    if (verificationData.response_status !== 'success') {
      console.error('Payment verification failed:', verificationData);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment verification failed',
        message: verificationData.message || 'Unknown error'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const paymentData = verificationData.data;
    
    // Check payment status - accept A, B, D, E, or T (test) status tags
    const acceptableStatuses = ['A', 'B', 'D', 'E', 'T'];
    if (!acceptableStatuses.includes(paymentData.status_tag)) {
      console.error('Payment not completed:', paymentData.status, paymentData.status_tag);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment not completed',
        status: paymentData.status,
        status_tag: paymentData.status_tag
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Log successful payment for record keeping
    console.log('Payment verified successfully:', {
      payment_id: paymentData.id,
      amount: paymentData.total_amount,
      currency: paymentData.currency,
      status: paymentData.status,
      customer_email: customer_email,
      hours: hours,
      project_details: project_details,
      date: paymentData.date
    });

    // Optional: Send confirmation email
    try {
      await sendConfirmationEmail(customer_email, paymentData, hours, project_details);
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError);
      // Don't fail the verification if email fails
    }

    // Return success response
    return new Response(JSON.stringify({ 
      success: true,
      payment: {
        id: paymentData.id,
        amount: paymentData.total_amount,
        currency: paymentData.currency,
        status: paymentData.status,
        date: paymentData.date,
        seller_received_amount: paymentData.seller_received_amount
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error during payment verification',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Optional: Function to send confirmation email
async function sendConfirmationEmail(
  customerEmail: string, 
  paymentData: any, 
  hours: number, 
  projectDetails: string
) {
  // For now, just log that we would send an email
  // You can integrate with SendGrid, Mailgun, or other email services later
  console.log(`Would send confirmation email to ${customerEmail}:`);
  console.log(`- Payment ID: ${paymentData.id}`);
  console.log(`- Amount: ${paymentData.total_amount} ${paymentData.currency}`);
  console.log(`- Hours: ${hours}`);
  console.log(`- Project: ${projectDetails}`);
  console.log(`- Status: ${paymentData.status}`);
  
  // Example email integration with SendGrid (uncomment to use):
  /*
  const SENDGRID_API_KEY = Netlify.env.get('SENDGRID_API_KEY');
  if (SENDGRID_API_KEY) {
    try {
      const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: customerEmail }],
              subject: 'Payment Confirmation - Nizar Al-Howaish Design Services'
            }
          ],
          from: { email: 'nizar@nizaralhowaish.de' },
          content: [
            {
              type: 'text/html',
              value: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #667eea;">Payment Confirmation</h2>
                  <p>Dear Customer,</p>
                  <p>Thank you for your payment! Your order has been confirmed.</p>
                  
                  <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>Order Details:</h3>
                    <p><strong>Service:</strong> Design Services (${hours} hour${hours > 1 ? 's' : ''})</p>
                    <p><strong>Amount:</strong> ${paymentData.total_amount} ${paymentData.currency}</p>
                    <p><strong>Payment ID:</strong> ${paymentData.id}</p>
                    <p><strong>Date:</strong> ${paymentData.date}</p>
                    <p><strong>Status:</strong> ${paymentData.status}</p>
                    ${projectDetails ? `<p><strong>Project Details:</strong> ${projectDetails}</p>` : ''}
                  </div>
                  
                  <p>I will be in touch with you soon to discuss your project details and timeline.</p>
                  
                  <p>Best regards,<br>
                  Nizar Al-Howaish<br>
                  <a href="https://nizaralhowaish.de">nizaralhowaish.de</a></p>
                </div>
              `
            }
          ]
        })
      });
      
      if (!emailResponse.ok) {
        throw new Error(`Email sending failed: ${emailResponse.statusText}`);
      }
      
      console.log('Confirmation email sent successfully');
    } catch (emailError) {
      console.error('Failed to send email via SendGrid:', emailError);
      throw emailError;
    }
  }
  */
}

export const config: Config = {
  path: "/verify-payment"
};
