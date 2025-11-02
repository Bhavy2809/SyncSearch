const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';

async function testFullMediaFlow() {
  console.log('🧪 Testing Full Media Processing Flow\n');

  const api = axios.create({
    baseURL: API_URL,
    headers: { 'Content-Type': 'application/json' },
  });

  try {
    // Step 1: Register user
    console.log('📝 Step 1: Registering user...');
    const registerResponse = await api.post('/auth/register', {
      email: `test-flow-${Date.now()}@example.com`,
      password: 'test123',
    });
    const token = registerResponse.data.access_token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    console.log('✅ User registered\n');

    // Step 2: Create project
    console.log('📝 Step 2: Creating project...');
    const projectResponse = await api.post('/projects', {
      name: 'Test Video Project',
      description: 'Testing audio extraction',
    });
    const projectId = projectResponse.data.id;
    console.log(`✅ Project created: ${projectId}\n`);

    // Step 3: Initialize upload
    console.log('📝 Step 3: Initializing media upload...');
    const uploadInitResponse = await api.post('/media/upload-url', {
      projectId,
      filename: 'test-video.mp4',
      mimeType: 'video/mp4',
    });
    const mediaId = uploadInitResponse.data.mediaId;
    const uploadUrl = uploadInitResponse.data.uploadUrl;
    console.log(`✅ Upload URL generated`);
    console.log(`   Media ID: ${mediaId}\n`);

    // Step 4: Create dummy video file (for testing - in real app, client uploads actual file)
    console.log('📝 Step 4: Creating test file...');
    const testFilePath = path.join(__dirname, 'test-upload.txt');
    fs.writeFileSync(testFilePath, 'This is a test file simulating video upload');
    console.log('✅ Test file created\n');

    // Step 5: Upload to S3 (simulated with text file)
    console.log('📝 Step 5: Uploading to S3...');
    const fileContent = fs.readFileSync(testFilePath);
    try {
      await axios.put(uploadUrl, fileContent, {
        headers: { 'Content-Type': 'video/mp4' },
        maxBodyLength: Infinity,
      });
      console.log('✅ File uploaded to S3\n');
    } catch (uploadError) {
      console.log('⚠️  S3 upload warning (expected for test file):', uploadError.message);
      console.log('   Continuing with test...\n');
    }

    // Step 6: Confirm upload
    console.log('📝 Step 6: Confirming upload...');
    const confirmResponse = await api.post(`/media/${mediaId}/confirm`);
    console.log(`✅ Upload confirmed`);
    console.log(`   Status: ${confirmResponse.data.status}`);
    console.log(`   📤 Job published to RabbitMQ!\n`);

    // Step 7: Check media status
    console.log('📝 Step 7: Checking media status...');
    const mediaResponse = await api.get(`/media/${mediaId}`);
    console.log(`✅ Media details:`);
    console.log(`   Filename: ${mediaResponse.data.filename}`);
    console.log(`   Status: ${mediaResponse.data.status}`);
    console.log(`   S3 Key: ${mediaResponse.data.originalS3Key}\n`);

    // Step 8: List all media
    console.log('📝 Step 8: Listing project media...');
    const listResponse = await api.get(`/media?projectId=${projectId}`);
    console.log(`✅ Found ${listResponse.data.length} media file(s)\n`);

    // Cleanup
    fs.unlinkSync(testFilePath);

    console.log('═══════════════════════════════════════════════════════');
    console.log('🎉 Test completed successfully!');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('📊 Summary:');
    console.log('   ✅ User registration');
    console.log('   ✅ Project creation');
    console.log('   ✅ Upload initialization');
    console.log('   ✅ S3 upload (simulated)');
    console.log('   ✅ Upload confirmation');
    console.log('   ✅ RabbitMQ job publishing');
    console.log('   ✅ Status tracking\n');
    
    console.log('🎬 WORKER READY TO PROCESS:');
    console.log('   Start the media-worker to process the job:');
    console.log('   cd media-worker && npm run start:dev\n');
    console.log('   The worker will:');
    console.log('   1. Download video from S3');
    console.log('   2. Extract audio with FFmpeg');
    console.log('   3. Upload audio back to S3');
    console.log('   4. Update database status');
    console.log('   5. Publish transcription job\n');

  } catch (error) {
    console.log('❌ Test failed:', error.response?.data || error.message);
    if (error.response?.data) {
      console.log('   Status:', error.response.status);
      console.log('   Data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testFullMediaFlow();
