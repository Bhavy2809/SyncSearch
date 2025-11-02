"""
RabbitMQ service for consuming transcription jobs
"""
import pika
import json
import time
from typing import Callable, Dict
from logger import logger
import config

class QueueService:
    def __init__(self):
        """Initialize RabbitMQ connection"""
        self.connection = None
        self.channel = None
    
    def connect(self):
        """Connect to RabbitMQ"""
        try:
            # Parse connection URL
            parameters = pika.URLParameters(config.RABBITMQ_URL)
            
            # Connect
            self.connection = pika.BlockingConnection(parameters)
            self.channel = self.connection.channel()
            
            # Set prefetch count (QoS)
            self.channel.basic_qos(prefetch_count=config.RABBITMQ_PREFETCH)
            
            # Ensure queue exists with same configuration as API service
            self.channel.queue_declare(
                queue=config.RABBITMQ_QUEUE,
                durable=True,
                arguments={
                    'x-message-ttl': 3600000,  # 1 hour TTL
                    'x-dead-letter-exchange': f'{config.RABBITMQ_EXCHANGE}.dlx'
                }
            )
            
            logger.info("✅ RabbitMQ connected")
            logger.info(f"   Queue: {config.RABBITMQ_QUEUE}")
            logger.info(f"   Prefetch: {config.RABBITMQ_PREFETCH}")
            
        except Exception as e:
            logger.error(f"❌ RabbitMQ connection failed: {str(e)}")
            raise
    
    def disconnect(self):
        """Disconnect from RabbitMQ"""
        try:
            if self.channel:
                self.channel.close()
            if self.connection:
                self.connection.close()
            logger.info("✅ RabbitMQ disconnected")
        except Exception as e:
            logger.error(f"❌ RabbitMQ disconnect error: {str(e)}")
    
    def consume(self, handler: Callable[[Dict], None]):
        """
        Start consuming jobs from queue
        
        Args:
            handler: Callback function to process each job
        """
        def callback(ch, method, properties, body):
            """Process incoming message"""
            try:
                # Parse job
                job = json.loads(body)
                logger.info(f"📥 Received job: {job.get('mediaId')} ({job.get('operation')})")
                
                # Get retry count from headers
                retry_count = 0
                if properties.headers:
                    retry_count = properties.headers.get('x-retry-count', 0)
                
                # Process job
                handler(job)
                
                # Acknowledge message (success)
                ch.basic_ack(delivery_tag=method.delivery_tag)
                logger.info(f"✅ Job completed: {job.get('mediaId')}")
                
            except Exception as e:
                logger.error(f"❌ Job failed: {str(e)}")
                
                # Retry logic
                if retry_count < config.MAX_RETRIES:
                    logger.warning(f"🔄 Retrying job (attempt {retry_count + 1}/{config.MAX_RETRIES})")
                    
                    # Wait before retry
                    time.sleep(config.RETRY_DELAY)
                    
                    # Requeue with incremented retry count
                    new_headers = properties.headers or {}
                    new_headers['x-retry-count'] = retry_count + 1
                    
                    ch.basic_publish(
                        exchange='',
                        routing_key=config.RABBITMQ_QUEUE,
                        body=body,
                        properties=pika.BasicProperties(
                            delivery_mode=2,  # Persistent
                            headers=new_headers
                        )
                    )
                    ch.basic_ack(delivery_tag=method.delivery_tag)
                else:
                    # Max retries reached - send to dead-letter queue
                    logger.error(f"💀 Max retries reached, sending to DLQ")
                    ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        
        # Start consuming
        logger.info(f"🎧 Listening for jobs on queue: {config.RABBITMQ_QUEUE}")
        self.channel.basic_consume(
            queue=config.RABBITMQ_QUEUE,
            on_message_callback=callback,
            auto_ack=False
        )
        
        try:
            self.channel.start_consuming()
        except KeyboardInterrupt:
            logger.info("🛑 Stopping consumer...")
            self.channel.stop_consuming()
