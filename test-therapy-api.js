// Test script for therapy adjustment API
const fetch = require('node-fetch');

async function testTherapyAdjustment() {
  try {
    console.log('Testing therapy adjustment API...');
    
    // Test without authentication (should return 401)
    const response = await fetch('http://localhost:3000/api/therapy-adjustment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        analysisDateRange: 7
      })
    });
    
    console.log('Response status:', response.status);
    console.log('Response text:', await response.text());
    
    if (response.status === 401) {
      console.log('✅ API is working correctly - returns 401 when not authenticated');
    } else if (response.status === 404) {
      console.log('❌ API not found - route may not be working');
    } else {
      console.log('🤔 Unexpected response');
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

testTherapyAdjustment(); 