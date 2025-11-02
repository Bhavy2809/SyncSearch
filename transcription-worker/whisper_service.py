"""
Whisper AI service for audio transcription
"""
import whisper
import torch
from typing import Dict, List
from logger import logger
import config

class WhisperService:
    def __init__(self):
        """Initialize Whisper model"""
        logger.info(f"🔄 Loading Whisper model '{config.WHISPER_MODEL}'...")
        
        # Check device availability
        if config.WHISPER_DEVICE == 'cuda' and not torch.cuda.is_available():
            logger.warning("⚠️  CUDA requested but not available, falling back to CPU")
            self.device = 'cpu'
        else:
            self.device = config.WHISPER_DEVICE
        
        # Load model
        self.model = whisper.load_model(config.WHISPER_MODEL, device=self.device)
        
        logger.info(f"✅ Whisper model loaded (device: {self.device})")
        logger.info(f"   Model size: {config.WHISPER_MODEL}")
        logger.info(f"   Language: {config.WHISPER_LANGUAGE or 'auto-detect'}")
    
    def transcribe(self, audio_path: str) -> Dict:
        """
        Transcribe audio file using Whisper
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Dictionary with transcription results:
            {
                'text': str,              # Full transcript
                'segments': List[Dict],   # Segments with timestamps
                'language': str,          # Detected language
                'confidence': float       # Average confidence (0-1)
            }
        """
        try:
            logger.info(f"🎙️  Transcribing audio: {audio_path}")
            
            # Transcribe with Whisper
            result = self.model.transcribe(
                audio_path,
                language=config.WHISPER_LANGUAGE,
                task='transcribe',
                fp16=(self.device == 'cuda'),  # Use FP16 on GPU for speed
                verbose=False
            )
            
            # Extract segments with timestamps
            segments = []
            total_confidence = 0.0
            
            for segment in result['segments']:
                segments.append({
                    'start': segment['start'],
                    'end': segment['end'],
                    'text': segment['text'].strip(),
                    'confidence': segment.get('no_speech_prob', 0.0)
                })
                total_confidence += segment.get('no_speech_prob', 0.0)
            
            # Calculate average confidence (inverse of no_speech_prob)
            avg_confidence = 1.0 - (total_confidence / len(segments)) if segments else 0.0
            
            transcript_result = {
                'text': result['text'].strip(),
                'segments': segments,
                'language': result['language'],
                'confidence': round(avg_confidence, 3)
            }
            
            logger.info(f"✅ Transcription complete:")
            logger.info(f"   Language: {transcript_result['language']}")
            logger.info(f"   Segments: {len(segments)}")
            logger.info(f"   Confidence: {transcript_result['confidence']:.1%}")
            logger.info(f"   Text length: {len(transcript_result['text'])} chars")
            logger.info(f"   Preview: {transcript_result['text'][:100]}...")
            
            return transcript_result
            
        except Exception as e:
            logger.error(f"❌ Transcription failed: {str(e)}")
            raise
