import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Media } from './media.entity';

@Entity('transcripts')
export class Transcript {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'media_id' })
  mediaId: string;

  @Column({ type: 'text' })
  text: string;

  @Column({ type: 'jsonb', nullable: true })
  segments: TranscriptSegment[];

  @Column({ default: 'en' })
  language: string;

  @Column({ type: 'float', nullable: true })
  confidence: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  // Relations
  @OneToOne(() => Media, (media) => media.transcript, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'media_id' })
  media: Media;
}

// Interface for transcript segments (Whisper output format)
export interface TranscriptSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}
