FROM node:18-slim AS development

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

CMD ["npm", "run", "start:dev"]

# Production stage
FROM node:18-slim AS production

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Create temp directory for file processing
RUN mkdir -p /app/tmp && chmod 777 /app/tmp

# Run as non-root user
RUN useradd -m -u 1001 worker && chown -R worker:worker /app
USER worker

CMD ["npm", "start"]
