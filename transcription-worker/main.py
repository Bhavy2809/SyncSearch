"""
Transcription Worker Entry Point
"""
import signal
import sys
from worker import TranscriptionWorker
from logger import logger

def signal_handler(sig, frame):
    """Handle SIGINT (Ctrl+C) gracefully"""
    logger.info("")
    logger.info("🛑 Received SIGINT signal")
    sys.exit(0)

def main():
    """Main entry point"""
    # Register signal handler
    signal.signal(signal.SIGINT, signal_handler)
    
    try:
        # Create and start worker
        worker = TranscriptionWorker()
        worker.start()
        
    except Exception as e:
        logger.error(f"💥 Fatal error: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    main()
