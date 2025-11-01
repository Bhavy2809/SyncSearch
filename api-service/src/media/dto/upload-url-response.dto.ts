export class UploadUrlResponseDto {
  mediaId: string;
  uploadUrl: string;
  expiresIn: number; // seconds
  s3Key: string;
}
