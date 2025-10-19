/**
 * Simple test script for NIN Verification API
 * Run with: node test-nin-verification.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api/nin-verification';

// Test data
const testNIN = '12345678901'; // Replace with a real test NIN

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
};

async function testVerifyNIN() {
  console.log('\n=== Testing NIN Verification ===\n');

  try {
    log.info(`Testing NIN: ${testNIN}`);

    const response = await axios.post(`${BASE_URL}/verify`, {
      nin: testNIN,
    });

    log.success('NIN Verification successful!');
    console.log('\nResponse:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.data?.fromCache) {
      log.info('Data retrieved from cache');
    } else {
      log.info('Data retrieved from API');
    }
  } catch (error) {
    log.error('NIN Verification failed!');

    if (error.response) {
      console.log('\nError Response:');
      console.log(JSON.stringify(error.response.data, null, 2));
      console.log(`Status Code: ${error.response.status}`);
    } else if (error.request) {
      log.error('No response received from server');
      log.warn('Make sure the server is running on http://localhost:5000');
    } else {
      log.error(error.message);
    }
  }
}

async function testInvalidNIN() {
  console.log('\n=== Testing Invalid NIN (should fail) ===\n');

  try {
    const response = await axios.post(`${BASE_URL}/verify`, {
      nin: '123', // Invalid NIN (not 11 digits)
    });

    log.error('This should have failed!');
  } catch (error) {
    if (error.response?.status === 400) {
      log.success('Validation working correctly!');
      console.log('Error message:', error.response.data.message);
    } else {
      log.error('Unexpected error');
      console.log(error.response?.data || error.message);
    }
  }
}

async function testMissingNIN() {
  console.log('\n=== Testing Missing NIN (should fail) ===\n');

  try {
    const response = await axios.post(`${BASE_URL}/verify`, {});

    log.error('This should have failed!');
  } catch (error) {
    if (error.response?.status === 400) {
      log.success('Validation working correctly!');
      console.log('Error message:', error.response.data.message);
    } else {
      log.error('Unexpected error');
      console.log(error.response?.data || error.message);
    }
  }
}

// Run all tests
(async () => {
  console.log('\n🧪 NIN Verification API Tests\n');
  console.log('='.repeat(50));

  // Check if server is running
  try {
    await axios.get('http://localhost:5000/health');
    log.success('Server is running');
  } catch (error) {
    log.error('Server is not running!');
    log.warn('Start the server with: npm run dev');
    process.exit(1);
  }

  await testVerifyNIN();
  await testInvalidNIN();
  await testMissingNIN();

  console.log('\n' + '='.repeat(50));
  console.log('\n✨ Tests completed!\n');
})();
