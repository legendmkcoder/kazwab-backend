const axios = require('axios');

/**
 * Generate a random application ID
 * @returns {string} Random 8-character alphanumeric string
 */
const generateApplicationId = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let applicationId = '';
  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    applicationId += characters[randomIndex];
  }
  return applicationId;
};

/**
 * Generate payment link using Flutterwave
 * @param {Object} data - Payment data
 * @param {string} data.tx_ref - Transaction reference
 * @param {number} data.amount - Payment amount
 * @param {string} data.email - Customer email
 * @param {string} data.name - Customer name
 * @param {string} data.phonenumber - Customer phone number
 * @returns {Object} Flutterwave payment response
 */
const generatePayment = async (data) => {
  try {
    const response = await axios.post(
      `${process.env.DEV_FLUTTERWAVE_URL}payments`,
      {
        tx_ref: data.tx_ref,
        amount: data.amount,
        currency: 'NGN',
        redirect_url: process.env.DEV_FLUTTERWAVE_REDIRECT,
        customer: {
          email: data.email,
          phonenumber: data.phonenumber || '',
          name: data.name,
        },
        customizations: {
          title: process.env.APP_NAME || 'Kazwab Payment',
          description: 'Payment for Kazwab services',
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEV_FLUTTERWAVE_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.status !== 'success' || !response.data.data.link) {
      throw new Error(
        'Failed to generate payment. Payment link missing from response.'
      );
    }

    return response.data.data;
  } catch (error) {
    console.error(
      'Error in generating payment:',
      error.response ? error.response.data : error.message
    );
    throw error;
  }
};

/**
 * Verify payment using Flutterwave
 * @param {string} reference - Payment reference
 * @returns {Object} Flutterwave verification response
 */
const verifyPayment = async (reference) => {
  try {
    const response = await axios.get(
      `${process.env.DEV_FLUTTERWAVE_URL}transactions/verify_by_reference?tx_ref=${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.DEV_FLUTTERWAVE_SECRET_KEY}`,
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error in verifying payment:', error);
    throw error;
  }
};

module.exports = {
  generateApplicationId,
  generatePayment,
  verifyPayment,
};
