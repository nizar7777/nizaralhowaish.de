// netlify/functions/verify-payment.js
// Server-side payment verification for SpaceRemit API

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body);
    const { payment_id, customer_email, hours, project_details } = body;

    // Validate required fields
    if (!payment_id) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Payment ID is required' 
        })
      };
    }

    // Get SpaceRemit private key from environment variables
    const SPACEREMIT_PRIVATE_KEY = process.env.SPACEREMIT_PRIVATE_KEY || 
                                   process.env.SPACEREMIT_TEST_PRIVATE_KEY;
    
    if (!SPACEREMIT_PRIVATE_KEY) {
      console.error('SpaceRemit private key not configured');
      return {
        statusCode: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Payment verification service not configured' 
        })
      };
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
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Payment verification failed',
          message: verificationData.message || 'Unknown error'
        })
      };
    }

    const paymentData = verificationData.data;
    
    // Check payment status - accept A, B, D, E, or T (test) status tags
    // Adding "T" for test payments as shown in the video
    const acceptableStatuses = ['A', 'B', 'D', 'E', 'T'];
    if (!acceptableStatuses.includes(paymentData.status_tag)) {
      console.error('Payment not completed:', paymentData.status, paymentData.status_tag);
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ 
          success: false, 
          error: 'Payment not completed',
          status: paymentData.status,
          status_tag: paymentData.status_tag,
          message: 'Acceptable status tags: A, B, D, E, T (test)'
        })
      };
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
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: true,
        payment: {
          id: paymentData.id,
          amount: paymentData.total_amount,
          currency: paymentData.currency,
          status: paymentData.status,
          date: paymentData.date,
          seller_received_amount: paymentData.seller_received_amount
        }
      })
    };

  } catch (error) {
    console.error('Payment verification error:', error);
    
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ 
        success: false, 
        error: 'Internal server error during payment verification',
        details: error.message || 'Unknown error'
      })
    };
  }
};

// Optional: Function to send confirmation email
async function sendConfirmationEmail(customerEmail, paymentData, hours, projectDetails) {
  // For now, just log that we would send an email
  // You can integrate with SendGrid, Mailgun, or other email services later
  console.log(`Would send confirmation email to ${customerEmail}:`);
  console.log(`- Payment ID: ${paymentData.id}`);
  console.log(`- Amount: $${paymentData.total_amount} ${paymentData.currency}`);
  console.log(`- Hours: ${hours}`);
  console.log(`- Project: ${projectDetails}`);
  console.log(`- Status: ${paymentData.status}`);
  
  // Example email integration with SendGrid (uncomment to use):
  /*
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
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
                    <p><strong>Amount:</strong> $${paymentData.total_amount} ${paymentData.currency}</p>
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
