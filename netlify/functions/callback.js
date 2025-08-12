// netlify/functions/callback.js
exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle OPTIONS request for CORS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Parse the incoming payload from SpaceRemit
    const payload = JSON.parse(event.body);
    
    console.log('Received SpaceRemit callback:', payload);

    // Validate the payload structure
    if (!payload.data || !payload.data.id) {
      console.error('Invalid payload structure:', payload);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid payload structure' })
      };
    }

    // Extract payment information
    const paymentData = payload.data;
    const paymentId = paymentData.id;
    const status = paymentData.status;
    const statusTag = paymentData.status_tag;
    const amount = paymentData.total_amount;
    const currency = paymentData.currency;

    // Log payment details
    console.log(`Payment ID: ${paymentId}`);
    console.log(`Status: ${status} (${statusTag})`);
    console.log(`Amount: ${amount} ${currency}`);

    // Verify payment with SpaceRemit API
    const verificationResult = await verifyPayment(paymentId);
    
    if (!verificationResult.success) {
      console.error('Payment verification failed:', verificationResult.error);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ 
          error: 'Payment verification failed',
          details: verificationResult.error 
        })
      };
    }

    // Check if payment is successful
    // According to SpaceRemit docs, accept payments with status A, B, D, or E
    const acceptableStatusTags = ['A', 'B', 'D', 'E'];
    const isPaymentSuccessful = acceptableStatusTags.includes(statusTag);

    if (isPaymentSuccessful) {
      // Process successful payment
      await processSuccessfulPayment(paymentData);
      
      console.log(`Payment ${paymentId} processed successfully`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Payment processed successfully',
          paymentId: paymentId,
          status: status
        })
      };
    } else {
      // Handle failed/pending payments
      console.log(`Payment ${paymentId} not successful. Status: ${status} (${statusTag})`);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          message: `Payment status: ${status}`,
          paymentId: paymentId,
          status: status
        })
      };
    }

  } catch (error) {
    console.error('Error processing callback:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

// Function to verify payment with SpaceRemit API
async function verifyPayment(paymentId) {
  try {
    // Get secret key from environment variables
    const secretKey = process.env.SPACEREMIT_SECRET_KEY || process.env.SPACEREMIT_TEST_SECRET_KEY;
    
    if (!secretKey) {
      throw new Error('SpaceRemit secret key not found in environment variables');
    }

    console.log('Verifying payment with SpaceRemit API...');

    const response = await fetch('https://spaceremit.com/api/v2/payment_info/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        private_key: secretKey,
        payment_id: paymentId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    console.log('SpaceRemit API response:', result);

    if (result.response_status !== 'success') {
      throw new Error(result.message || 'Payment verification failed');
    }

    return {
      success: true,
      data: result.data
    };

  } catch (error) {
    console.error('Payment verification error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to process successful payment
async function processSuccessfulPayment(paymentData) {
  try {
    // Here you would typically:
    // 1. Save payment data to your database
    // 2. Send confirmation email to customer
    // 3. Update order status
    // 4. Trigger any business logic

    console.log('Processing successful payment:', {
      id: paymentData.id,
      amount: paymentData.total_amount,
      currency: paymentData.currency,
      buyerEmail: extractEmailFromNotes(paymentData.notes),
      status: paymentData.status
    });

    // Example: Log to a simple file (in production, use a proper database)
    const paymentRecord = {
      timestamp: new Date().toISOString(),
      paymentId: paymentData.id,
      amount: paymentData.total_amount,
      currency: paymentData.currency,
      status: paymentData.status,
      statusTag: paymentData.status_tag,
      buyerAmount: paymentData.buyer_payed_amount,
      sellerAmount: paymentData.seller_received_amount,
      date: paymentData.date,
      notes: paymentData.notes
    };

    console.log('Payment record:', paymentRecord);

    // In a real application, you would save this to a database
    // Example: await saveToDatabase(paymentRecord);

    // Send confirmation email (implement this based on your email service)
    // Example: await sendConfirmationEmail(paymentRecord);

    return true;

  } catch (error) {
    console.error('Error processing successful payment:', error);
    throw error;
  }
}

// Helper function to extract email from notes (if stored there)
function extractEmailFromNotes(notes) {
  if (!notes) return null;
  
  const emailMatch = notes.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
  return emailMatch ? emailMatch[0] : null;
}
