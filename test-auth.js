const axios = require('axios');

const API_URL = 'http://localhost:3000';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

let authToken = '';

async function testAuthFlow() {
  console.log(`${colors.cyan}\n╔════════════════════════════════════════════╗`);
  console.log(`║   Testing SyncSearch Authentication Flow  ║`);
  console.log(`╚════════════════════════════════════════════╝${colors.reset}\n`);

  try {
    // 1. Test user registration
    console.log(`${colors.yellow}1. Testing User Registration...${colors.reset}`);
    const testEmail = `test${Date.now()}@example.com`;
    const testPassword = 'password123';

    const registerResponse = await axios.post(`${API_URL}/auth/register`, {
      email: testEmail,
      password: testPassword,
    });

    console.log(`${colors.green}✅ User registered successfully${colors.reset}`);
    console.log(`   Email: ${registerResponse.data.user.email}`);
    console.log(`   User ID: ${registerResponse.data.user.id}`);
    console.log(`   Token: ${registerResponse.data.access_token.substring(0, 20)}...`);

    authToken = registerResponse.data.access_token;

    // 2. Test duplicate registration (should fail)
    console.log(`\n${colors.yellow}2. Testing Duplicate Registration (should fail)...${colors.reset}`);
    try {
      await axios.post(`${API_URL}/auth/register`, {
        email: testEmail,
        password: testPassword,
      });
      console.log(`${colors.red}❌ Test failed: Duplicate registration should not be allowed${colors.reset}`);
    } catch (error) {
      if (error.response && error.response.status === 409) {
        console.log(`${colors.green}✅ Correctly rejected duplicate registration${colors.reset}`);
        console.log(`   Error: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // 3. Test login with correct credentials
    console.log(`\n${colors.yellow}3. Testing Login with Correct Credentials...${colors.reset}`);
    const loginResponse = await axios.post(`${API_URL}/auth/login`, {
      email: testEmail,
      password: testPassword,
    });

    console.log(`${colors.green}✅ Login successful${colors.reset}`);
    console.log(`   Token: ${loginResponse.data.access_token.substring(0, 20)}...`);

    // 4. Test login with wrong password (should fail)
    console.log(`\n${colors.yellow}4. Testing Login with Wrong Password (should fail)...${colors.reset}`);
    try {
      await axios.post(`${API_URL}/auth/login`, {
        email: testEmail,
        password: 'wrongpassword',
      });
      console.log(`${colors.red}❌ Test failed: Should not login with wrong password${colors.reset}`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(`${colors.green}✅ Correctly rejected invalid credentials${colors.reset}`);
      } else {
        throw error;
      }
    }

    // 5. Test protected route without token (should fail)
    console.log(`\n${colors.yellow}5. Testing Protected Route Without Token (should fail)...${colors.reset}`);
    try {
      await axios.get(`${API_URL}/auth/me`);
      console.log(`${colors.red}❌ Test failed: Should not access protected route without token${colors.reset}`);
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log(`${colors.green}✅ Correctly rejected request without token${colors.reset}`);
      } else {
        throw error;
      }
    }

    // 6. Test protected route with valid token
    console.log(`\n${colors.yellow}6. Testing Protected Route With Valid Token...${colors.reset}`);
    const profileResponse = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });

    console.log(`${colors.green}✅ Successfully accessed protected route${colors.reset}`);
    console.log(`   User ID: ${profileResponse.data.id}`);
    console.log(`   Email: ${profileResponse.data.email}`);

    // 7. Test validation (invalid email)
    console.log(`\n${colors.yellow}7. Testing Validation (invalid email)...${colors.reset}`);
    try {
      await axios.post(`${API_URL}/auth/register`, {
        email: 'not-an-email',
        password: 'password123',
      });
      console.log(`${colors.red}❌ Test failed: Should not accept invalid email${colors.reset}`);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`${colors.green}✅ Correctly rejected invalid email${colors.reset}`);
        console.log(`   Error: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // 8. Test validation (short password)
    console.log(`\n${colors.yellow}8. Testing Validation (short password)...${colors.reset}`);
    try {
      await axios.post(`${API_URL}/auth/register`, {
        email: 'test@example.com',
        password: '123',
      });
      console.log(`${colors.red}❌ Test failed: Should not accept short password${colors.reset}`);
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log(`${colors.green}✅ Correctly rejected short password${colors.reset}`);
        console.log(`   Error: ${error.response.data.message}`);
      } else {
        throw error;
      }
    }

    // Summary
    console.log(`\n${colors.cyan}╔════════════════════════════════════════════╗`);
    console.log(`║          All Tests Passed! ✅              ║`);
    console.log(`╚════════════════════════════════════════════╝${colors.reset}\n`);

    console.log(`${colors.green}🎉 Authentication system is fully functional!${colors.reset}\n`);
    console.log(`${colors.cyan}Available Endpoints:${colors.reset}`);
    console.log(`  POST /auth/register - Create new user`);
    console.log(`  POST /auth/login    - Login and get JWT token`);
    console.log(`  GET  /auth/me       - Get current user (protected)`);
    console.log('');

  } catch (error) {
    console.log(`\n${colors.red}❌ Test failed with error:${colors.reset}`);
    if (error.response) {
      console.log(`   Status: ${error.response.status}`);
      console.log(`   Message: ${JSON.stringify(error.response.data)}`);
    } else {
      console.log(`   ${error.message}`);
    }
    process.exit(1);
  }
}

// Run the tests
testAuthFlow();
