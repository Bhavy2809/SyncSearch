const axios = require('axios');

async function testAPIService() {
  console.log('🧪 Testing SyncSearch API Service...\n');

  try {
    // Test health endpoint
    const healthResponse = await axios.get('http://localhost:3000/health');
    console.log('✅ Health Check:', healthResponse.data);

    // Test root endpoint
    const rootResponse = await axios.get('http://localhost:3000');
    console.log('✅ Root Endpoint:', rootResponse.data);

    console.log('\n🎉 All API endpoints are working!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testAPIService();
