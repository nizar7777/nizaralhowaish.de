// netlify/functions/verify-payment.js
import fetch from 'node-fetch';

export async function handler(event) {
  try {
    const { transactionId } = JSON.parse(event.body);

    if (!transactionId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Transaction ID is required' })
      };
    }

    const response = await fetch(`https://spaceremit.com/api/v2/transaction/${transactionId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.SPACEREMIT_PRIVATE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
}
