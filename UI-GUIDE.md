# 🎨 SyncSearch UI Guide & Features

## 🌟 What You Can Do with SyncSearch

SyncSearch is your AI-powered media transcription platform. Here's everything you can do:

### 📋 Core Features

#### 1. **User Authentication** ✅
- **Register**: Create a new account with email/password
- **Login**: Sign in to access your projects
- **Logout**: Secure sign out
- **Profile**: View your account details

#### 2. **Project Management** ✅
- **Create Projects**: Organize your media files into projects
- **View Projects**: See all your projects in a grid or list
- **Edit Projects**: Update project name and description
- **Delete Projects**: Remove projects you no longer need
- **Search Projects**: Find projects quickly

#### 3. **Media Upload** ✅
- **Drag & Drop**: Drag files directly into the upload zone
- **Browse Files**: Click to select files from your computer
- **Supported Formats**: 
  - Video: MP4, AVI, MOV, MKV, WebM
  - Audio: MP3, WAV, M4A, FLAC, OGG
- **Direct S3 Upload**: Files upload directly to cloud storage (no server bottleneck)
- **Progress Tracking**: Real-time upload progress bars
- **File Validation**: Automatic file type and size checking

#### 4. **Media Management** ✅
- **View Media**: See all uploaded files in a project
- **Media Status**: Track processing status (uploading → processing → transcribing → complete)
- **File Details**: View filename, size, upload date
- **Delete Media**: Remove unwanted files

#### 5. **Transcription** ✅ (When workers are running)
- **Auto-Transcription**: Whisper AI automatically transcribes your media
- **View Transcripts**: Read full transcription text
- **Timestamped Segments**: See text with precise timestamps
- **Confidence Scores**: View AI confidence for each segment
- **Language Detection**: Auto-detect spoken language
- **Search Transcripts**: Find specific words in your content (coming soon)

---

## 🧪 How to Test All Features

### **Step 1: Start the Application**

Make sure everything is running:
```powershell
# Check system status
powershell -ExecutionPolicy Bypass -File verify-system.ps1
```

You should see:
- ✅ Frontend running on http://localhost:3001
- ✅ Backend API on http://localhost:3000
- ✅ Database connected

### **Step 2: Test User Registration & Login**

1. **Open your browser**: http://localhost:3001
2. **Register a new account**:
   - Click "Register" button
   - Email: `demo@syncsearch.com`
   - Password: `demo123`
   - Click "Create Account"
3. **You're automatically logged in!**

### **Step 3: Test Project Creation**

1. **Click "New Project"** button (top right)
2. **Fill in details**:
   - Name: `My First Project`
   - Description: `Testing SyncSearch features`
3. **Click "Create"**
4. **See your project** in the dashboard

### **Step 4: Test Media Upload**

1. **Click on your project** to open it
2. **Upload a file**:
   - **Option A**: Drag a video/audio file into the upload zone
   - **Option B**: Click "Choose files" and select from your computer
3. **Watch the upload**:
   - Progress bar shows upload percentage
   - Status changes from "Uploading" → "Processing"
4. **Test multiple uploads**: Upload 2-3 files at once

### **Step 5: Test Media Processing** (Optional - requires workers)

To see full processing and transcription:

**Terminal 1 - Start Media Worker:**
```powershell
cd media-worker
npm run dev
```

**Terminal 2 - Start Transcription Worker:**
```powershell
cd transcription-worker
python main.py
```

Now upload a file and watch the status change:
1. **Uploading** → File uploading to S3
2. **Processing** → Audio extraction in progress
3. **Transcribing** → Whisper AI generating transcript
4. **Complete** → Click to view transcript!

### **Step 6: Test Project Editing**

1. **From dashboard**, hover over a project
2. **Click "Edit"** button
3. **Change the name**: `Updated Project Name`
4. **Click "Save"**

### **Step 7: Test Deletion**

1. **Delete a media file**:
   - Open a project
   - Click "Delete" on a media file
   - Confirm deletion
2. **Delete a project**:
   - From dashboard, click "Delete" on a project
   - Confirm deletion

### **Step 8: Test Logout & Login**

1. **Click your email** in the header
2. **Click "Logout"**
3. **Login again** with your credentials

---

## 🎨 UI Improvements Available

Your current UI uses custom CSS with professional styling. Here are the improvements I can make:

### **Option 1: Modern Gradient UI** (Recommended)
- Beautiful gradient backgrounds
- Glassmorphism effects (frosted glass look)
- Smooth animations
- Dark mode support

### **Option 2: Minimalist Clean UI**
- Apple-style clean design
- Lots of white space
- Subtle shadows
- Focus on content

### **Option 3: Bold & Colorful UI**
- Vibrant colors
- Large buttons
- Fun animations
- Modern gradients

### **Option 4: Professional Dashboard UI**
- Enterprise-grade look
- Data-focused design
- Charts and statistics
- Clean typography

---

## 🚀 Quick Test Commands

### **Full System Test Script:**

Create a test user and project automatically:

```powershell
# Test authentication
$user = @{
    email = "test@demo.com"
    password = "test123"
} | ConvertTo-Json

$register = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" `
    -Method POST -ContentType "application/json" -Body $user

Write-Host "✅ User registered: $($register.user.email)"
Write-Host "Token: $($register.access_token.Substring(0,20))..."

# Test project creation
$project = @{
    name = "Test Project"
    description = "Created via API"
} | ConvertTo-Json

$headers = @{
    "Authorization" = "Bearer $($register.access_token)"
    "Content-Type" = "application/json"
}

$newProject = Invoke-RestMethod -Uri "http://localhost:3000/projects" `
    -Method POST -Headers $headers -Body $project

Write-Host "✅ Project created: $($newProject.name) ($($newProject.id))"
```

### **Check All Services:**
```powershell
powershell -ExecutionPolicy Bypass -File verify-system.ps1
```

### **View Database Data:**
```powershell
# See all users
docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT id, email, created_at FROM users;"

# See all projects
docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT id, name, created_at FROM projects;"

# See all media files
docker exec syncsearch-postgres psql -U syncsearch -d syncsearch -c "SELECT id, filename, status FROM media;"
```

---

## 🎯 Common Issues & Solutions

### **UI Not Loading?**
```powershell
# Check frontend status
cd web-app
npm start
```

### **Can't Login?**
```powershell
# Check API status
cd api-service
npm run start:dev
```

### **Upload Not Working?**
- Check Minio S3 is running: `docker ps`
- Check API logs in terminal
- Verify file size < 500MB

### **No Transcripts?**
- Workers need to be running (optional)
- Without workers, files upload but don't process
- Status stays at "Processing"

---

## 📊 Testing Checklist

Use this checklist to test everything:

- [ ] Register new user
- [ ] Login with credentials
- [ ] Create project
- [ ] Upload video file (e.g., MP4)
- [ ] Upload audio file (e.g., MP3)
- [ ] View uploaded media
- [ ] Edit project name
- [ ] Delete media file
- [ ] Create second project
- [ ] Switch between projects
- [ ] View profile (email in header)
- [ ] Logout
- [ ] Login again
- [ ] Delete project
- [ ] Start workers (optional)
- [ ] Check transcript appears (optional)

---

## 🎨 Want UI Improvements?

**Tell me which style you prefer:**

1. **Modern Gradient UI** - Trendy, colorful, glassmorphism
2. **Minimalist Clean** - Apple-style, white space, elegant
3. **Bold & Colorful** - Fun, vibrant, energetic
4. **Professional Dashboard** - Enterprise, data-focused, charts

I'll implement whichever you choose with:
- ✨ Beautiful animations
- 🎨 Professional color schemes
- 📱 Perfect mobile responsiveness
- ⚡ Smooth transitions
- 🌙 Optional dark mode

**Just say:** "Make the UI [style name]" and I'll update everything!

---

## 🔥 Pro Tips

1. **Use Chrome DevTools**: Press F12 to see network requests
2. **Check Console**: Look for any JavaScript errors
3. **Test Mobile**: Resize browser to see responsive design
4. **Upload Test Files**: Use small files first (< 10MB)
5. **Watch Status Changes**: Status updates show processing progress

---

## 📞 Next Steps

1. ✅ **Test all features** using the guide above
2. 🎨 **Choose a UI style** you like
3. 🚀 **Optional**: Start workers for full transcription
4. 📊 **View your data** in the dashboard
5. 🎉 **Enjoy your AI-powered media platform!**

Need help? Just ask! 😊
