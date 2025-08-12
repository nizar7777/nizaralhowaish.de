// netlify/functions/verify-payment.js
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
    // Parse request body
    let requestData;
    try {
      requestData = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' })
      };
    }

    const { paymentId } = requestData;

    if (!paymentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Payment ID is required' })
      };
    }

    console.log(`Verifying payment: ${paymentId}`);

    // Get secret key from environment variables
    const secretKey = process.env.SPACEREMIT_SECRET_KEY || process.env.SPACEREMIT_TEST_SECRET_KEY;
    
    if (!secretKey) {
      console.error('SpaceRemit secret key not found in environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Call SpaceRemit API to verify payment
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
      console.error(`SpaceRemit API error: ${response.status} ${response.statusText}`);
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to verify payment with SpaceRemit',
          details: `HTTP ${response.status}`
        })
      };
    }

    const result = await response.json();
    
    console.log('SpaceRemit API response:', result);

    if (result.response_status !== 'success') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Payment verification failed',
          message: result.message || 'Unknown error from SpaceRemit'
        })
      };
    }

    // Extract payment data
    const paymentData = result.data;
    const status = paymentData.status;
    const statusTag = paymentData.status_tag;

    // Determine if payment is successful
    // According to SpaceRemit docs: accept payments with status A, B, D, or E
    const acceptableStatusTags = ['A', 'B', 'D', 'E'];
    const isSuccessful = acceptableStatusTags.includes(statusTag);

    // Return payment information
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        paymentId: paymentData.id,
        status: status,
        statusTag: statusTag,
        isSuccessful: isSuccessful,
        amount: paymentData.total_amount,
        currency: paymentData.currency,
        buyerPaidAmount: paymentData.buyer_payed_amount,
        sellerReceivedAmount: paymentData.seller_received_amount,
        date: paymentData.date,
        notes: paymentData.notes,
        type: paymentData.type,
        fees: {
          totalFees: paymentData.total_fees,
          buyerFees: paymentData.buyer_total_fees,
          sellerFees: paymentData.seller_total_fees
        },
        statusDescription: getStatusDescription(statusTag)
      })
    };

  } catch (error) {
    console.error('Error verifying payment:', error);
    
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

// Helper function to get human-readable status description
function getStatusDescription(statusTag) {
  const statusMap = {
    'A': 'Completed - Payment completed and amount transferred to the seller',
    'B': 'Pending - Payment added to seller\'s pending balance, awaiting delivery of service',
    'C': 'Refused - Payment refused. Transaction did not go through',
    'D': 'Waiting a Holding Time - Payment waiting for holding time, but added to seller\'s pending balance',
    'E': 'Need Our Review - Payment needs review, but amount added to seller\'s pending balance',
    'F': 'Not Paid - Payment not completed. This is only a deposit; no funds have been transferred',
    'G': 'Canceled - Payment canceled by either buyer or seller before completion',
    'H': 'Refunded - Payment refunded to the buyer',
    'T': 'Test Payment - Test payment, not involving real funds. Used for testing purposes only'
  };

  return statusMap[statusTag] || `Unknown status: ${statusTag}`;
}
