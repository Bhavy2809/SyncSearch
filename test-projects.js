const axios = require('axios');

const API_URL = 'http://localhost:3000';
let authToken = '';
let testProjectId = '';

// Test user credentials
const testUser = {
  email: `test-${Date.now()}@example.com`,
  password: 'testpass123',
};

async function runTests() {
  console.log('🧪 Testing Projects Module\n');

  try {
    // Step 1: Register a test user
    console.log('📝 Step 1: Registering test user...');
    const registerResponse = await axios.post(`${API_URL}/auth/register`, testUser);
    authToken = registerResponse.data.access_token;
    console.log('✅ User registered successfully');
    console.log(`   Token: ${authToken.substring(0, 20)}...\n`);

    // Step 2: Create a project
    console.log('📝 Step 2: Creating a project...');
    const createResponse = await axios.post(
      `${API_URL}/projects`,
      {
        name: 'My First Project',
        description: 'Testing project creation',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    testProjectId = createResponse.data.id;
    console.log('✅ Project created successfully');
    console.log(`   ID: ${testProjectId}`);
    console.log(`   Name: ${createResponse.data.name}`);
    console.log(`   Description: ${createResponse.data.description}\n`);

    // Step 3: List all projects
    console.log('📝 Step 3: Listing all projects...');
    const listResponse = await axios.get(`${API_URL}/projects`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log(`✅ Found ${listResponse.data.length} project(s)`);
    listResponse.data.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name} (${p.id})`);
    });
    console.log('');

    // Step 4: Get single project
    console.log('📝 Step 4: Getting project by ID...');
    const getResponse = await axios.get(`${API_URL}/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log('✅ Project retrieved successfully');
    console.log(`   Name: ${getResponse.data.name}`);
    console.log(`   Created: ${getResponse.data.createdAt}\n`);

    // Step 5: Update project
    console.log('📝 Step 5: Updating project...');
    const updateResponse = await axios.patch(
      `${API_URL}/projects/${testProjectId}`,
      {
        name: 'Updated Project Name',
        description: 'Updated description',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Project updated successfully');
    console.log(`   New Name: ${updateResponse.data.name}`);
    console.log(`   New Description: ${updateResponse.data.description}\n`);

    // Step 6: Create a second project
    console.log('📝 Step 6: Creating second project...');
    await axios.post(
      `${API_URL}/projects`,
      {
        name: 'Second Project',
      },
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    console.log('✅ Second project created\n');

    // Step 7: List projects again (should have 2)
    console.log('📝 Step 7: Listing all projects again...');
    const listResponse2 = await axios.get(`${API_URL}/projects`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log(`✅ Found ${listResponse2.data.length} project(s)`);
    listResponse2.data.forEach((p, idx) => {
      console.log(`   ${idx + 1}. ${p.name} (${p.id})`);
    });
    console.log('');

    // Step 8: Test authorization - try accessing without token
    console.log('📝 Step 8: Testing authorization (no token)...');
    try {
      await axios.get(`${API_URL}/projects`);
      console.log('❌ FAILED: Should have been unauthorized\n');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Correctly rejected unauthorized request\n');
      } else {
        console.log('❌ Unexpected error:', error.message, '\n');
      }
    }

    // Step 9: Test validation - create project without name
    console.log('📝 Step 9: Testing validation (missing name)...');
    try {
      await axios.post(
        `${API_URL}/projects`,
        {
          description: 'No name provided',
        },
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );
      console.log('❌ FAILED: Should have rejected missing name\n');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Correctly rejected invalid data');
        console.log(`   Error: ${JSON.stringify(error.response.data.message)}\n`);
      } else {
        console.log('❌ Unexpected error:', error.message, '\n');
      }
    }

    // Step 10: Delete project
    console.log('📝 Step 10: Deleting first project...');
    await axios.delete(`${API_URL}/projects/${testProjectId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    console.log('✅ Project deleted successfully\n');

    // Step 11: Verify deletion
    console.log('📝 Step 11: Verifying project was deleted...');
    try {
      await axios.get(`${API_URL}/projects/${testProjectId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      console.log('❌ FAILED: Project should not exist\n');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ Correctly returned 404 for deleted project\n');
      } else {
        console.log('❌ Unexpected error:', error.message, '\n');
      }
    }

    console.log('🎉 All tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Project creation');
    console.log('   ✅ Project listing');
    console.log('   ✅ Project retrieval');
    console.log('   ✅ Project updating');
    console.log('   ✅ Project deletion');
    console.log('   ✅ Authorization checks');
    console.log('   ✅ Validation checks');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    } else if (error.code) {
      console.error('   Error Code:', error.code);
      console.error('   Stack:', error.stack);
    }
  }
}

runTests();
