"use client";

import { useState } from 'react';

interface FeatureDefinitionUploadProps {
  onUploadSuccess: () => void;
}

// Interface for feature definitions
interface FeatureDefinitions {
  uploadedAt: string;
  originalFileName: string;
  isXLSX: boolean;
  categories: string[];
  features: {
    [category: string]: Array<{
      Code?: string;
      Definition?: string;
      Example1?: string;
      example1?: string;
      Example2?: string;
      example2?: string;
      NonExample1?: string;
      nonexample1?: string;
      NonExample2?: string;
      nonexample2?: string;
    }>;
  };
}

// Function to regenerate annotation columns for a specific transcript
const regenerateAnnotationColumnsForTranscript = (transcriptId: string, featureDefinitions: FeatureDefinitions) => {
  try {
    console.log(`Regenerating annotation columns for transcript ${transcriptId}...`);
    
    // Get existing table data for this transcript
    const tableDataKey = `tableData-${transcriptId}`;
    const existingTableData = localStorage.getItem(tableDataKey);
    
    if (!existingTableData) {
      console.log(`No table data found for transcript ${transcriptId}, skipping`);
      return;
    }
    
    const parsedTableData = JSON.parse(existingTableData);
    
    // Handle both old and new localStorage formats
    let tableData;
    if (parsedTableData.tableData && Array.isArray(parsedTableData.tableData)) {
      tableData = parsedTableData.tableData;
    } else if (Array.isArray(parsedTableData)) {
      tableData = parsedTableData;
    } else {
      console.log(`Invalid table data format for transcript ${transcriptId}, skipping`);
      return;
    }
    
    const numRows = tableData.length;
    
    // Create new annotation data structure based on the current codebook
    const newAnnotationData: Record<string, {
      codes: string[];
      definitions: Record<string, {
        Definition: string;
        example1: string;
        example2: string;
        nonexample1: string;
        nonexample2: string;
      }>;
      annotations: Record<number, Record<string, boolean>>;
    }> = {};
    
    if (featureDefinitions.categories && featureDefinitions.features) {
      featureDefinitions.categories.forEach((category: string) => {
        const categoryFeatures = featureDefinitions.features[category] || [];
        
        // Extract codes
        const codes = categoryFeatures.map((feature: { Code?: string }) => feature.Code).filter((code): code is string => Boolean(code));
        
        // Create definitions object
        const definitions: Record<string, {
          Definition: string;
          example1: string;
          example2: string;
          nonexample1: string;
          nonexample2: string;
        }> = {};
        categoryFeatures.forEach((feature: { 
          Code?: string; 
          Definition?: string; 
          Example1?: string; 
          example1?: string; 
          Example2?: string; 
          example2?: string; 
          NonExample1?: string; 
          nonexample1?: string; 
          NonExample2?: string; 
          nonexample2?: string 
        }) => {
          if (feature.Code) {
            definitions[feature.Code] = {
              Definition: feature.Definition || '',
              example1: feature.Example1 || feature.example1 || '',
              example2: feature.Example2 || feature.example2 || '',
              nonexample1: feature.NonExample1 || feature.nonexample1 || '',
              nonexample2: feature.NonExample2 || feature.nonexample2 || ''
            };
          }
        });
        
        // Initialize annotations for each line (all false by default)
        // This works correctly regardless of whether the transcript has a "Selectable" column
        // If there's no Selectable column, all rows will be annotatable via isTableRowSelectable()
        const annotations: { [rowIndex: number]: { [code: string]: boolean } } = {};
        for (let i = 0; i < numRows; i++) {
          annotations[i] = {};
          codes.forEach((code: string) => {
            annotations[i][code] = false;
          });
        }
        
        newAnnotationData[category] = {
          codes,
          definitions,
          annotations
        };
      });
    }
    
    // Save the new annotation data
    const annotationKey = `annotations-${transcriptId}`;
    localStorage.setItem(annotationKey, JSON.stringify(newAnnotationData));
    
    console.log(`Successfully regenerated annotation columns for transcript ${transcriptId}:`, Object.keys(newAnnotationData));
    
  } catch (error) {
    console.error(`Failed to regenerate annotation columns for transcript ${transcriptId}:`, error);
  }
};

export default function FeatureDefinitionUpload({ onUploadSuccess }: FeatureDefinitionUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (selectedFile: File) => {
    const fileName = selectedFile.name.toLowerCase();
    
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.csv')) {
      setUploadStatus('Please select an XLSX or CSV file');
      return;
    }
    
    setFile(selectedFile);
    setUploadStatus(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleUpload = async () => {
    if (!file) {
      setUploadStatus('Please select a file first');
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-feature-definition', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        // Save feature definition data to localStorage
        if (result.storage && !result.storage.cloudStorage) {
                  // Save the complete data structure for compatibility with both AnnotationPanel and transcript page
        const featureDefinitionsData = result.storage.data;
        localStorage.setItem('feature-definitions', JSON.stringify(featureDefinitionsData));
        console.log('Feature definitions saved to localStorage:', featureDefinitionsData);
        console.log('Categories detected:', featureDefinitionsData.categories);
          
                  // Also log the structure for debugging
        if (featureDefinitionsData.features) {
          Object.keys(featureDefinitionsData.features).forEach(category => {
            console.log(`Category "${category}":`, featureDefinitionsData.features[category].length, 'features');
          });
        }
        }

        // Automatically regenerate annotation columns for all transcripts
        if (result.annotationsCleared) {
          try {
            // Get all transcript IDs from localStorage
            const transcriptIds = [];
            const storedTranscripts = localStorage.getItem('transcripts');
            if (storedTranscripts) {
              const parsedTranscripts = JSON.parse(storedTranscripts);
              transcriptIds.push(...parsedTranscripts.map((t: { id: string }) => t.id.replace('t', '')));
            }
            
            // Also check for any existing annotation keys in localStorage
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('annotations-')) {
                const transcriptId = key.replace('annotations-', '');
                if (!transcriptIds.includes(transcriptId)) {
                  transcriptIds.push(transcriptId);
                }
              }
            }
            
            console.log(`Found ${transcriptIds.length} transcripts to regenerate:`, transcriptIds);
            
            // For each transcript, regenerate annotation columns from the new codebook
            transcriptIds.forEach(transcriptId => {
              regenerateAnnotationColumnsForTranscript(transcriptId, result.storage.data);
            });
            
            console.log(`Successfully regenerated annotation columns for ${transcriptIds.length} transcripts`);
          } catch (error) {
            console.warn('Failed to regenerate annotation columns:', error);
          }
        }
        
        setUploadStatus(`✅ ${result.message} - Annotation columns automatically generated for all transcripts from the new codebook.`);
        setFile(null);
        onUploadSuccess();
        
        // Clear success message after 5 seconds (longer due to more important message)
        setTimeout(() => {
          setUploadStatus(null);
        }, 5000);
      } else {
        setUploadStatus(`❌ Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('❌ Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setUploadStatus(null);
  };

  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Upload Feature Definition
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload an XLSX file with multiple sheets or a CSV file. Each sheet/file represents a feature category.
          <br />
          <span className="text-orange-600 font-medium">⚠️ Warning: This will clear all existing annotations from all transcripts.</span>
        </p>
        
        {/* File Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
            dragOver 
              ? 'border-blue-400 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          {file ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center space-x-2">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-gray-700 font-medium">{file.name}</span>
              </div>
              <p className="text-sm text-gray-500">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex space-x-3 justify-center">
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition"
                >
                  {uploading ? 'Uploading...' : 'Upload Feature Definition'}
                </button>
                <button
                  onClick={clearFile}
                  disabled={uploading}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 disabled:bg-gray-300 transition"
                >
                  Clear
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <svg className="mx-auto w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div>
                <p className="text-gray-600">
                  Drop your feature definition file here, or{' '}
                  <label className="text-blue-500 hover:text-blue-600 cursor-pointer font-medium">
                    browse files
                    <input
                      type="file"
                      className="hidden"
                      accept=".xlsx,.csv"
                      onChange={handleFileChange}
                      disabled={uploading}
                      lang="en"
                      title="Choose feature definition files to upload"
                      aria-label="Upload feature definition files"
                    />
                  </label>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Supported formats: XLSX, CSV
                </p>
                <p className="text-xs text-gray-500">
                  Required columns: Code, Definition
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upload Status */}
        {uploadStatus && (
          <div className={`mt-4 p-3 rounded-md text-sm ${
            uploadStatus.startsWith('✅') 
              ? 'bg-green-100 text-green-700' 
              : 'bg-red-100 text-red-700'
          }`}>
            {uploadStatus}
          </div>
        )}

        {/* Format Information */}
        <div className="mt-6 text-left">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">File Format Requirements:</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>XLSX:</strong> Each sheet becomes a separate feature category</p>
            <p><strong>CSV:</strong> Filename (without extension) becomes the category name</p>
            <p><strong>Required columns:</strong> Code, Definition</p>
            <p><strong>Optional columns:</strong> Example1, Example2, NonExample1, NonExample2</p>
          </div>
        </div>
      </div>
    </div>
  );
} 