import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToOne, JoinColumn } from 'typeorm';
import { Project } from './project.entity';
import { Transcript } from './transcript.entity';

export enum MediaStatus {
  UPLOADING = 'uploading',
  PROCESSING = 'processing',
  TRANSCRIBING = 'transcribing',
  COMPLETE = 'complete',
  FAILED = 'failed',
}

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'project_id' })
  projectId: string;

  @Column()
  filename: string;

  @Column({ name: 'original_s3_key' })
  originalS3Key: string;

  @Column({ name: 'audio_s3_key', nullable: true })
  audioS3Key: string;

  @Column({ type: 'int', nullable: true })
  duration: number; // Duration in seconds

  @Column({ type: 'bigint', nullable: true })
  filesize: number; // File size in bytes

  @Column({ name: 'mime_type', nullable: true })
  mimeType: string;

  @Column({
    type: 'enum',
    enum: MediaStatus,
    default: MediaStatus.UPLOADING,
  })
  status: MediaStatus;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Project, (project) => project.media, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @OneToOne(() => Transcript, (transcript) => transcript.media)
  transcript: Transcript;
}
