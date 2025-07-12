"use client";

import { useState } from 'react';

interface ZipUploadProps {
  transcripts: Array<{ id: string; displayName: string; isNew: boolean }>;
  onUploadSuccess?: () => void;
}

export default function ZipUpload({ transcripts, onUploadSuccess }: ZipUploadProps) {
  const [selectedTranscript, setSelectedTranscript] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadingAll, setUploadingAll] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [userId, setUserId] = useState<string>('');
  const [userIdError, setUserIdError] = useState<string>('');

  const validateUserId = (id: string): boolean => {
    if (!id.trim()) {
      setUserIdError('User ID is required');
      return false;
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(id.trim())) {
      setUserIdError('User ID can only contain letters, numbers, hyphens, and underscores');
      return false;
    }
    if (id.trim().length < 3 || id.trim().length > 20) {
      setUserIdError('User ID must be between 3 and 20 characters');
      return false;
    }
    setUserIdError('');
    return true;
  };

  const handleUpload = async () => {
    if (!selectedTranscript) {
      setUploadStatus({
        type: 'error',
        message: 'Please select an option to upload'
      });
      return;
    }

    if (!validateUserId(userId)) {
      setUploadStatus({
        type: 'error',
        message: 'Please enter a valid User ID'
      });
      return;
    }

    // Check if user selected "Upload All" option
    if (selectedTranscript === 'ALL_TRANSCRIPTS') {
      return handleUploadAll();
    }

    setUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/upload-zip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptId: selectedTranscript,
          userId: userId.trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus({
          type: 'success',
          message: `${selectedTranscript} uploaded successfully (${result.fileSize})`
        });
        setSelectedTranscript('');
        onUploadSuccess?.();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setUploadStatus({ type: null, message: '' });
        }, 5000);
      } else {
        setUploadStatus({
          type: 'error',
          message: result.error || 'Upload failed'
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: 'Failed to upload transcript. Please try again.'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleUploadAll = async () => {
    if (transcripts.length === 0) {
      setUploadStatus({
        type: 'error',
        message: 'No transcripts available to upload'
      });
      return;
    }

    setUploadingAll(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const response = await fetch('/api/upload-all-transcripts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId.trim()
        }),
      });

      const result = await response.json();

      if (result.success) {
        setUploadStatus({
          type: 'success',
          message: `All ${result.transcriptCount} transcripts uploaded successfully (${result.fileSize})`
        });
        setSelectedTranscript('');
        onUploadSuccess?.();
        
        // Clear success message after 5 seconds
        setTimeout(() => {
          setUploadStatus({ type: null, message: '' });
        }, 5000);
      } else {
        setUploadStatus({
          type: 'error',
          message: result.error || 'Upload failed'
        });
      }
    } catch (error) {
      console.error('Upload all error:', error);
      setUploadStatus({
        type: 'error',
        message: 'Failed to upload all transcripts. Please try again.'
      });
    } finally {
      setUploadingAll(false);
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 className="text-lg font-medium text-gray-800 mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
        </svg>
        Upload Transcript to Cloud Storage
      </h3>
      
      <div className="space-y-4">
        {/* User ID Input */}
        <div>
          <label htmlFor="user-id-input" className="block text-sm font-medium text-gray-700 mb-2">
            User ID <span className="text-red-500">*</span>
          </label>
          <input
            id="user-id-input"
            type="text"
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              if (userIdError) setUserIdError('');
            }}
            disabled={uploading || uploadingAll}
            placeholder="Enter your unique user ID (e.g., john_doe_2024)"
            className={`block w-full px-3 py-2 border rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${
              userIdError ? 'border-red-300' : 'border-gray-300'
            }`}
          />
          {userIdError && (
            <p className="mt-1 text-xs text-red-600">{userIdError}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            3-20 characters, letters, numbers, hyphens, and underscores only. This organizes your uploads in cloud storage.
          </p>
        </div>

        {/* Transcript Selection */}
        <div>
          <label htmlFor="transcript-select" className="block text-sm font-medium text-gray-700 mb-2">
            Select Option
          </label>
          <select
            id="transcript-select"
            value={selectedTranscript}
            onChange={(e) => setSelectedTranscript(e.target.value)}
            disabled={uploading || uploadingAll}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
          >
            <option value="">Choose an option...</option>
            <option value="ALL_TRANSCRIPTS">📦 Upload All Transcripts ({transcripts.length})</option>
            <optgroup label="Individual Transcripts">
              {transcripts.map(transcript => (
                <option key={transcript.id} value={transcript.id}>
                  {transcript.displayName} ({transcript.id})
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {/* Upload Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={uploading || uploadingAll || !selectedTranscript}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              uploading || uploadingAll || !selectedTranscript
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : selectedTranscript === 'ALL_TRANSCRIPTS'
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {(uploading || uploadingAll) ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {selectedTranscript === 'ALL_TRANSCRIPTS' ? 'Uploading All...' : 'Uploading...'}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
                Upload to Cloud
              </>
            )}
          </button>

          <span className="text-xs text-gray-500">
            {selectedTranscript === 'ALL_TRANSCRIPTS' 
              ? 'Uploads all transcripts in one zip file'
              : selectedTranscript 
                ? 'Uploads selected transcript as a zip file'
                : 'Select an option to upload'
            }
          </span>
        </div>

        {/* Status Messages */}
        {uploadStatus.type && (
          <div className={`p-3 rounded-md border ${
            uploadStatus.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {uploadStatus.type === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <span className="text-sm font-medium">{uploadStatus.message}</span>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
          <div className="flex">
            <svg className="w-5 h-5 text-blue-400 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">What gets uploaded:</p>
              <ul className="text-xs space-y-1">
                <li>• All transcript files (CSV, JSON, speakers, content)</li>
                <li>• Images and annotations</li>
                <li>• Learning goal notes</li>
                <li>• Feature definitions (if customized)</li>
                <li>• <strong>Upload All</strong>: Creates a single zip with all transcripts</li>
              </ul>
              <p className="text-xs mt-2 font-medium">
                Files are uploaded to Google Cloud Storage with user IP organization
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 