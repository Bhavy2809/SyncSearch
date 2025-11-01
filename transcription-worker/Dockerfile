# Base image with CUDA support for GPU acceleration
FROM nvidia/cuda:11.8.0-base-ubuntu22.04

# Set working directory
WORKDIR /app

# Install Python and system dependencies
RUN apt-get update && apt-get install -y \
    python3.10 \
    python3-pip \
    ffmpeg \
    git \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Download Whisper model (base model by default)
RUN python3 -c "import whisper; whisper.load_model('base')"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import whisper; print('healthy')" || exit 1

# Run the worker
CMD ["python3", "main.py"]
