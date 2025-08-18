"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { saveTranscriptData, safeStorageSet, safeStorageGet } from '../utils/storageUtils';

interface UploadResponse {
  success: boolean;
  transcriptId?: string;
  speakers?: string[];
  rowCount?: number;
  error?: string;
  storage?: {
    cloudStorage: boolean;
    files: Record<string, string>;
    originalFile?: Record<string, string>;
  };
}

interface TranscriptUploadProps {
  onUploadSuccess?: () => void;
}

export default function TranscriptUpload({ onUploadSuccess }: TranscriptUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const router = useRouter();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      setUploadStatus({
        type: 'error',
        message: 'Please select an Excel file (.xlsx, .xls) or CSV file (.csv)'
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus({ type: null, message: '' });

    try {
      const formData = new FormData();
      formData.append('file', file);
      
      // Pass existing transcript numbers to help with sequential numbering
      const existingTranscriptsRaw = await safeStorageGet('transcripts');
      const existingTranscripts = JSON.parse(existingTranscriptsRaw || '[]');
      const existingNumbers = existingTranscripts.map((t: { id: string }) => {
        const match = t.id.match(/^t(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      }).filter((n: number) => n > 0);
      
      if (existingNumbers.length > 0) {
        formData.append('existingNumbers', JSON.stringify(existingNumbers));
      }

      const response = await fetch('/api/upload-transcript', {
        method: 'POST',
        body: formData,
      });

      const result: UploadResponse = await response.json();

      if (result.success && result.transcriptId) {
        // Save transcript data to storage with IndexedDB fallback
        if (result.storage && !result.storage.cloudStorage) {
          const transcriptData = {
            id: result.transcriptId,
            displayName: `Transcript ${result.transcriptId}`,
            isNew: true,
            files: result.storage.files,
            originalFile: result.storage.originalFile,
            speakers: result.speakers || [],
            rowCount: result.rowCount || 0,
            uploadedAt: new Date().toISOString()
          };

          // Save individual transcript files using safe storage with chunking support
          for (const [filename, content] of Object.entries(result.storage.files)) {
            try {
              if (filename.includes('transcript') && filename.endsWith('.csv')) {
                // Use the chunking utility for CSV files
                await saveTranscriptData(result.transcriptId, content as string);
              } else {
                // Use safe storage for other files
                await safeStorageSet(`${result.transcriptId}-${filename}`, content as string);
              }
            } catch (error) {
              console.error(`Failed to save ${filename}:`, error);
              throw new Error(`Storage failed for ${filename}. Please try again or contact support.`);
            }
          }

          // Save original file
          if (result.storage.originalFile) {
            await safeStorageSet(`${result.transcriptId}-original`, JSON.stringify(result.storage.originalFile));
          }

          // Update transcripts list in storage
          const existingTranscriptsRaw = await safeStorageGet('transcripts');
          const existingTranscripts = JSON.parse(existingTranscriptsRaw || '[]');
          const updatedTranscripts = [...existingTranscripts, {
            id: result.transcriptId,
            displayName: `Transcript ${result.transcriptId}`,
            isNew: true
          }];
          await safeStorageSet('transcripts', JSON.stringify(updatedTranscripts));

          console.log('Transcript saved to storage:', transcriptData);
        }

        setUploadStatus({
          type: 'success',
          message: `Transcript uploaded successfully! ID: ${result.transcriptId}. Redirecting...`
        });
        
        // Call the callback to refresh the transcript list
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        
        // Redirect to the new transcript after a short delay
        setTimeout(() => {
          if (result.transcriptId) {
            router.push(`/transcript/${result.transcriptId.replace('t', '')}`);
          }
        }, 2000);
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
        message: 'Failed to upload file. Please try again.'
      });
    } finally {
      setIsUploading(false);
    }
  }, [router, onUploadSuccess]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="space-y-4">
          <div className="text-6xl text-gray-400">📄</div>
          
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Upload Transcript
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Drag and drop an Excel or CSV file here, or click to select
            </p>
            <p className="text-xs text-gray-400 mb-2">
              Required columns: #, Speaker, Dialogue
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <div className="flex items-start">
                <svg className="w-4 h-4 text-blue-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs text-blue-700">
                  <p className="font-medium mb-1">Additional Columns:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li><strong>&quot;Selectable&quot;</strong>: Mark rows with &quot;yes&quot;/&quot;true&quot;/&quot;1&quot; to enable annotation features. <strong>If no Selectable column exists, all rows are automatically annotatable.</strong></li>
                    <li><strong>&quot;Segment&quot;</strong>: Group rows into segments (e.g., &quot;a&quot;, &quot;b&quot;, &quot;c&quot;) for organized viewing and filtering.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
            disabled={isUploading}
            lang="en"
            title="Choose Excel or CSV files to upload"
            aria-label="Upload transcript files"
          />
          
          <label
            htmlFor="file-upload"
            className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md cursor-pointer transition-colors ${
              isUploading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isUploading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Uploading...
              </>
            ) : (
              'Select Excel or CSV File'
            )}
          </label>
        </div>
      </div>

      {/* Status Messages */}
      {uploadStatus.type && (
        <div className={`mt-4 p-4 rounded-md ${
          uploadStatus.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
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
    </div>
  );
} 