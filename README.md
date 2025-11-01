# SyncSearch

**AI-Powered Media Transcription & Semantic Search Platform**

SyncSearch unlocks knowledge trapped in video and audio files through automatic transcription and intelligent semantic search. Upload your media, and our cloud-native processing pipeline will make it instantly searchable.

## 🏗️ Architecture

This is a **cloud-native, event-driven microservices** application built for AWS:

- **web-app**: React frontend with direct-to-S3 uploads
- **api-service**: NestJS backend (authentication, user management, pre-signed URLs)
- **media-worker**: Node.js workers for FFmpeg audio extraction
- **transcription-worker**: Python workers with self-hosted Whisper AI (GPU-accelerated)
- **RabbitMQ**: Asynchronous job queue for processing pipeline
- **PostgreSQL**: Metadata storage (users, projects, transcripts)
- **AWS S3**: Blob storage for media files

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.10+ (for transcription worker)
- AWS Account (for production deployment)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Bhavy2809/SyncSearch.git
   cd SyncSearch
   ```

2. **Start infrastructure services**
   ```bash
   docker-compose up -d postgres rabbitmq minio
   ```

3. **Set up environment variables**
   ```bash
   # Copy example env files
   cp api-service/.env.example api-service/.env
   cp media-worker/.env.example media-worker/.env
   cp transcription-worker/.env.example transcription-worker/.env
   cp web-app/.env.example web-app/.env
   ```

4. **Install dependencies and run services**
   
   **API Service:**
   ```bash
   cd api-service
   npm install
   npm run start:dev
   ```

   **Media Worker:**
   ```bash
   cd media-worker
   npm install
   npm run start:dev
   ```

   **Web App:**
   ```bash
   cd web-app
   npm install
   npm start
   ```

   **Transcription Worker (Python):**
   ```bash
   cd transcription-worker
   pip install -r requirements.txt
   python main.py
   ```

5. **Access the application**
   - Web App: http://localhost:3001
   - API: http://localhost:3000
   - RabbitMQ Management: http://localhost:15672 (user: syncsearch, pass: devpassword)
   - Minio Console: http://localhost:9001 (user: minioadmin, pass: minioadmin)

### Run Everything with Docker

```bash
docker-compose up --build
```

## 📂 Project Structure

```
SyncSearch/
├── api-service/           # NestJS API (auth, S3 pre-signed URLs)
├── media-worker/          # Node.js FFmpeg processing worker
├── transcription-worker/  # Python Whisper AI worker
├── web-app/              # React frontend
├── docker-compose.yml    # Local development orchestration
├── .github/              
│   └── copilot-instructions.md  # AI coding agent guidelines
└── README.md
```

## 🧪 Testing

```bash
# API Service
cd api-service && npm test

# Media Worker
cd media-worker && npm test

# Web App
cd web-app && npm test
```

## 🌐 Production Deployment (AWS)

### Infrastructure Requirements

- **Amazon S3**: Media blob storage
- **Amazon RDS**: PostgreSQL database
- **Amazon MQ** or self-hosted RabbitMQ on EC2
- **Amazon ECS/EKS**: Docker container orchestration
- **EC2 g4dn instances**: GPU-accelerated Whisper transcription

### Deployment Steps

1. Set up AWS infrastructure (S3, RDS, ECS/EKS)
2. Configure environment variables with production credentials
3. Build and push Docker images to ECR
4. Deploy services to ECS/EKS
5. Configure auto-scaling for workers

(Detailed deployment guide coming soon)

## 🔑 Environment Variables

See `.env.example` files in each service directory for required configuration.

**Critical variables:**
- `DATABASE_URL`: PostgreSQL connection string
- `RABBITMQ_URL`: RabbitMQ connection URL
- `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`: S3 credentials
- `JWT_SECRET`: Authentication secret
- `STRIPE_SECRET_KEY`: Payment processing (optional)

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guidelines](CONTRIBUTING.md) first.

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙋 Support

For questions or issues, please open a GitHub issue or contact [@Bhavy2809](https://github.com/Bhavy2809).

---

**Built with ❤️ using AWS, NestJS, React, and Whisper AI**