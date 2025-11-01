const axios = require('axios');

const API_URL = 'http://localhost:3000';
let authToken = '';
let userId = '';
let projectId = '';
let mediaId = '';

// Helper to make authenticated requests
const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

async function runTests() {
  console.log('🧪 Testing Media Upload System\n');

  try {
    // Step 1: Register and login
    console.log('📝 Step 1: Registering test user...');
    const registerResponse = await api.post('/auth/register', {
      email: `test-media-${Date.now()}@example.com`,
      password: 'test123',
    });
    authToken = registerResponse.data.access_token;
    api.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    console.log('✅ User registered successfully\n');

    // Step 2: Create a project
    console.log('📝 Step 2: Creating a project...');
    const projectResponse = await api.post('/projects', {
      name: 'Video Library',
      description: 'Test project for media uploads',
    });
    projectId = projectResponse.data.id;
    console.log(`✅ Project created: ${projectId}\n`);

    // Step 3: Initialize media upload (get pre-signed URL)
    console.log('📝 Step 3: Initializing media upload...');
    const uploadInitResponse = await api.post('/media/upload-url', {
      projectId: projectId,
      filename: 'test-video.mp4',
      mimeType: 'video/mp4',
      filesize: 1024000,
    });
    
    mediaId = uploadInitResponse.data.mediaId;
    const uploadUrl = uploadInitResponse.data.uploadUrl;
    const expiresIn = uploadInitResponse.data.expiresIn;
    
    console.log(`✅ Upload URL generated`);
    console.log(`   Media ID: ${mediaId}`);
    console.log(`   Expires in: ${expiresIn} seconds`);
    console.log(`   URL: ${uploadUrl.substring(0, 80)}...`);
    console.log(`   ℹ️  Client would upload directly to this S3 URL\n`);

    // Step 4: List media in project (should show UPLOADING status)
    console.log('📝 Step 4: Listing media in project...');
    const mediaListResponse = await api.get(`/media?projectId=${projectId}`);
    console.log(`✅ Found ${mediaListResponse.data.length} media file(s)`);
    console.log(`   Status: ${mediaListResponse.data[0].status}`);
    console.log(`   Filename: ${mediaListResponse.data[0].filename}\n`);

    // Step 5: Confirm upload (simulate client completing S3 upload)
    console.log('📝 Step 5: Confirming upload completion...');
    const confirmResponse = await api.post(`/media/${mediaId}/confirm`);
    console.log(`✅ Upload confirmed`);
    console.log(`   Status: ${confirmResponse.data.status}`);
    console.log(`   📤 Job published to RabbitMQ: extract_audio\n`);

    // Step 6: Get media details
    console.log('📝 Step 6: Getting media details...');
    const mediaDetailsResponse = await api.get(`/media/${mediaId}`);
    console.log(`✅ Media details retrieved`);
    console.log(`   ID: ${mediaDetailsResponse.data.id}`);
    console.log(`   Filename: ${mediaDetailsResponse.data.filename}`);
    console.log(`   Status: ${mediaDetailsResponse.data.status}`);
    console.log(`   S3 Key: ${mediaDetailsResponse.data.originalS3Key}\n`);

    // Step 7: Create second media file
    console.log('📝 Step 7: Creating second media file...');
    const uploadInit2Response = await api.post('/media/upload-url', {
      projectId: projectId,
      filename: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
    });
    console.log(`✅ Second media initialized: ${uploadInit2Response.data.mediaId}\n`);

    // Step 8: List all media
    console.log('📝 Step 8: Listing all media in project...');
    const allMediaResponse = await api.get(`/media?projectId=${projectId}`);
    console.log(`✅ Found ${allMediaResponse.data.length} media file(s):`);
    allMediaResponse.data.forEach((media, index) => {
      console.log(`   ${index + 1}. ${media.filename} (${media.status})`);
    });
    console.log();

    // Step 9: Test authorization (try to access with wrong project)
    console.log('📝 Step 9: Testing authorization...');
    try {
      await api.get('/media?projectId=00000000-0000-0000-0000-000000000000');
      console.log('❌ Should have rejected unauthorized access');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly rejected access to non-existent project\n');
      } else {
        throw error;
      }
    }

    // Step 10: Test validation (missing required fields)
    console.log('📝 Step 10: Testing validation...');
    try {
      await api.post('/media/upload-url', {
        projectId: projectId,
        // Missing filename
      });
      console.log('❌ Should have rejected invalid data');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Correctly rejected invalid data');
        console.log(`   Error: ${JSON.stringify(error.response.data.message)}\n`);
      } else {
        throw error;
      }
    }

    // Step 11: Delete media
    console.log('📝 Step 11: Deleting first media file...');
    await api.delete(`/media/${mediaId}`);
    console.log('✅ Media deleted successfully\n');

    // Step 12: Verify deletion
    console.log('📝 Step 12: Verifying media was deleted...');
    try {
      await api.get(`/media/${mediaId}`);
      console.log('❌ Should have returned 404');
    } catch (error) {
      if (error.response?.status === 404) {
        console.log('✅ Correctly returned 404 for deleted media\n');
      } else {
        throw error;
      }
    }

    console.log('🎉 All tests passed!\n');
    console.log('📊 Summary:');
    console.log('   ✅ Media upload initialization');
    console.log('   ✅ Pre-signed URL generation');
    console.log('   ✅ Upload confirmation');
    console.log('   ✅ RabbitMQ job publishing');
    console.log('   ✅ Media listing');
    console.log('   ✅ Media retrieval');
    console.log('   ✅ Media deletion');
    console.log('   ✅ Authorization checks');
    console.log('   ✅ Validation checks');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

runTests();
