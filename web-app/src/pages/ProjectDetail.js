import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import Layout from '../components/Layout';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import { projectsService, mediaService } from '../services';
import { formatDate, formatFileSize, getStatusBadgeColor, getStatusIcon } from '../utils/helpers';

const ProjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const [showTranscriptModal, setShowTranscriptModal] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [loadingTranscript, setLoadingTranscript] = useState(false);

  useEffect(() => {
    fetchProject();
    fetchMedia();
    // Poll for media status updates every 5 seconds
    const interval = setInterval(fetchMedia, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchProject = async () => {
    try {
      const data = await projectsService.getById(id);
      setProject(data);
    } catch (err) {
      setError('Failed to load project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchMedia = async () => {
    try {
      const data = await mediaService.getByProject(id);
      setMedia(data);
    } catch (err) {
      console.error('Failed to fetch media:', err);
    }
  };

  const handleUpload = async (files) => {
    setUploading(true);
    setError('');

    for (const file of files) {
      try {
        // Step 1: Get pre-signed URL from API
        const { uploadUrl } = await mediaService.getUploadUrl(
          id,
          file.name,
          file.type
        );

        // Step 2: Upload to S3 with progress tracking
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        await mediaService.uploadToS3(uploadUrl, file, (progress) => {
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
        });

        // Step 3: Refresh media list
        fetchMedia();

        // Remove progress after successful upload
        setTimeout(() => {
          setUploadProgress(prev => {
            const updated = { ...prev };
            delete updated[file.name];
            return updated;
          });
        }, 2000);
      } catch (err) {
        setError(`Failed to upload ${file.name}: ${err.message}`);
        console.error(err);
      }
    }

    setUploading(false);
  };

  const handleViewTranscript = async (mediaItem) => {
    setSelectedMedia(mediaItem);
    setShowTranscriptModal(true);
    setLoadingTranscript(true);
    setTranscript(null);

    try {
      const data = await mediaService.getTranscript(mediaItem.id);
      setTranscript(data);
    } catch (err) {
      console.error('Failed to load transcript:', err);
      if (err.response?.status === 404) {
        setTranscript({ error: 'Transcript not available yet. Please wait for transcription to complete.' });
      } else {
        setTranscript({ error: 'Failed to load transcript.' });
      }
    } finally {
      setLoadingTranscript(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const validFiles = acceptedFiles.filter(file => {
      const validTypes = ['video/', 'audio/'];
      return validTypes.some(type => file.type.startsWith(type));
    });

    if (validFiles.length !== acceptedFiles.length) {
      setError('Some files were rejected. Only video and audio files are allowed.');
    }

    if (validFiles.length > 0) {
      handleUpload(validFiles);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/*': ['.mp4', '.avi', '.mov', '.mkv', '.webm'],
      'audio/*': ['.mp3', '.wav', '.m4a', '.flac', '.ogg']
    },
    disabled: uploading
  });

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout>
        <div className="text-center py-12">
          <p className="text-gray-600">Project not found</p>
          <Button onClick={() => navigate('/projects')} className="mt-4">
            Back to Projects
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/projects')}
          className="mb-4"
        >
          ← Back to Projects
        </Button>
        
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
            {project.description && (
              <p className="text-gray-600 mt-2">{project.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Created {formatDate(project.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Upload Zone */}
      <Card className="mb-8">
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          
          <div className="text-5xl mb-4">
            {uploading ? '⏳' : '📁'}
          </div>

          {uploading ? (
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">Uploading files...</p>
              <div className="max-w-md mx-auto space-y-2">
                {Object.entries(uploadProgress).map(([filename, progress]) => (
                  <div key={filename} className="text-left">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate mr-2">{filename}</span>
                      <span className="text-gray-600">{progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : isDragActive ? (
            <p className="text-lg font-medium text-primary-600">Drop files here</p>
          ) : (
            <div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drag & drop media files here
              </p>
              <p className="text-sm text-gray-600">
                or click to browse • Supports video and audio files
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Media List */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Media Files ({media.length})
        </h2>

        {media.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎬</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No media files yet
              </h3>
              <p className="text-gray-600">
                Upload your first video or audio file to get started
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {media.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {/* Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                        {item.fileType?.startsWith('video') ? '🎥' : '🎵'}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {item.filename}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                        <span>{formatFileSize(item.fileSize)}</span>
                        <span>•</span>
                        <span>{formatDate(item.createdAt)}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(item.status)} ${
                        ['processing', 'transcribing'].includes(item.status) ? 'animate-pulse-status' : ''
                      }`}>
                        {getStatusIcon(item.status)} {item.status}
                      </span>

                      {/* View Transcript Button */}
                      {item.status === 'complete' && (
                        <Button
                          variant="ghost"
                          onClick={() => handleViewTranscript(item)}
                          className="text-sm"
                        >
                          View Transcript
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Transcript Modal */}
      <Modal
        isOpen={showTranscriptModal}
        onClose={() => {
          setShowTranscriptModal(false);
          setSelectedMedia(null);
          setTranscript(null);
        }}
        title={`Transcript: ${selectedMedia?.filename}`}
        size="xl"
      >
        {loadingTranscript ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : transcript?.error ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">⏳</div>
            <p className="text-gray-600">{transcript.error}</p>
          </div>
        ) : transcript ? (
          <div>
            {/* Transcript Info */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Language:</span>{' '}
                  <span className="font-medium">{transcript.language || 'en'}</span>
                </div>
                <div>
                  <span className="text-gray-600">Confidence:</span>{' '}
                  <span className="font-medium">
                    {transcript.confidence ? `${(transcript.confidence * 100).toFixed(1)}%` : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Full Text */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-900 mb-2">Full Transcript</h3>
              <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                <p className="text-gray-700 whitespace-pre-wrap">{transcript.text}</p>
              </div>
            </div>

            {/* Timestamped Segments */}
            {transcript.segments && transcript.segments.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">
                  Timestamped Segments ({transcript.segments.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {transcript.segments.map((segment, index) => (
                    <div
                      key={index}
                      className="flex space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex-shrink-0">
                        <span className="inline-block bg-primary-100 text-primary-700 text-xs font-mono px-2 py-1 rounded">
                          {new Date(segment.start * 1000).toISOString().substr(11, 8)}
                        </span>
                      </div>
                      <p className="text-gray-700 flex-1">{segment.text}</p>
                      {segment.confidence && (
                        <span className="flex-shrink-0 text-xs text-gray-500">
                          {(segment.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </Layout>
  );
};

export default ProjectDetail;
