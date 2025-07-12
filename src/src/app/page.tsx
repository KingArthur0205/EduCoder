"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import TranscriptUpload from "./components/TranscriptUpload";
import FeatureDefinitionUpload from "./components/FeatureDefinitionUpload";
import FeatureDefinitionsViewer from "./components/FeatureDefinitionsViewer";
import ZipUpload from "./components/ZipUpload";
import Settings from "./components/Settings";
import { safeStorageGet } from "./utils/storageUtils";
import * as XLSX from 'xlsx';

interface TranscriptInfo {
  id: string;
  displayName: string;
  isNew: boolean;
}

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [transcripts, setTranscripts] = useState<TranscriptInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [deletingTranscript, setDeletingTranscript] = useState<string | null>(null);
  const [showFeatureUpload, setShowFeatureUpload] = useState(false);
  const [showFeatureViewer, setShowFeatureViewer] = useState(false);
  const [showZipUpload, setShowZipUpload] = useState(false);
  const [visitedTranscripts, setVisitedTranscripts] = useState<Set<string>>(new Set());
  const [featureViewerRefreshTrigger, setFeatureViewerRefreshTrigger] = useState(0);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Function to extract a meaningful lesson title from content data
  const extractLessonTitle = useCallback((content: Record<string, unknown>, transcriptId: string): string => {
    // Priority 1: Custom lesson title
    if (typeof content.customLessonTitle === 'string' && content.customLessonTitle.trim() !== '') {
      return content.customLessonTitle.trim();
    }
    
    // Priority 2: Lesson title field (if not default)
    if (typeof content.lesson_title === 'string' && content.lesson_title !== 'Lesson Title' && content.lesson_title.trim() !== '') {
      return content.lesson_title.trim();
    }
    
    // Priority 3: Extract lesson name from gradeLevel if it contains lesson info
    if (typeof content.gradeLevel === 'string') {
      // Look for patterns like "Lesson X: Title" or "Unit X: Title, Lesson Y: Title"
      const lessonMatch = content.gradeLevel.match(/Lesson \d+: ([^,]+)/);
      if (lessonMatch && lessonMatch[1]) {
        return lessonMatch[1].trim();
      }
    }
    
    // Priority 4: Use grade_level if it exists and is meaningful
    if (typeof content.grade_level === 'string' && content.grade_level !== 'Grade Level' && content.grade_level.trim() !== '') {
      return content.grade_level.trim();
    }
    
    // Priority 5: Use activityPurpose if available
    if (typeof content.activityPurpose === 'string' && content.activityPurpose.trim() !== '') {
      // Take first line or first 50 characters
      const purpose = content.activityPurpose.trim().split('\n')[0];
      return purpose.length > 50 ? purpose.substring(0, 47) + '...' : purpose;
    }
    
    // Fallback: Use the generic format
    return `Transcript ${transcriptId}`;
  }, []);

  // Function to load content for a single transcript
  const loadTranscriptContent = useCallback(async (transcriptId: string): Promise<string> => {
    try {
      // First try API (public folder)
      try {
        const response = await fetch(`/api/transcript/${transcriptId}?file=content.json`);
        if (response.ok) {
          const content = await response.json();
          return extractLessonTitle(content, transcriptId);
        }
      } catch {
        // Fallback to localStorage
      }
      
      // Try localStorage
      const contentData = localStorage.getItem(`${transcriptId}-content.json`);
      if (contentData) {
        const content = JSON.parse(contentData);
        return extractLessonTitle(content, transcriptId);
      }
      
      // If no content found, return generic name
      return `Transcript ${transcriptId}`;
    } catch (error) {
      console.error(`Error loading content for ${transcriptId}:`, error);
      return `Transcript ${transcriptId}`;
    }
  }, [extractLessonTitle]);

  const loadTranscripts = useCallback(async () => {
    try {
      const allTranscripts: TranscriptInfo[] = [];
      
      // Load transcripts from localStorage
      if (typeof window !== 'undefined') {
        const storedTranscripts = localStorage.getItem('transcripts');
        if (storedTranscripts) {
          const parsedTranscripts = JSON.parse(storedTranscripts);
          allTranscripts.push(...parsedTranscripts);
          console.log('Loaded transcripts from localStorage:', parsedTranscripts);
        }
      }
      
      // Also try to load existing transcripts from the API (public folder)
      try {
        const response = await fetch('/api/list-transcripts');
        const data = await response.json();
        
        if (data.success && data.transcripts && data.transcripts.length > 0) {
          // Add public folder transcripts that aren't already in localStorage
          const localStorageIds = new Set(allTranscripts.map(t => t.id));
          const publicTranscripts = data.transcripts.filter((t: TranscriptInfo) => !localStorageIds.has(t.id));
          allTranscripts.push(...publicTranscripts);
          console.log('Also found transcripts in public folder:', publicTranscripts);
        }
      } catch (apiError) {
        console.log('API call failed (expected in local storage mode):', apiError);
      }
      
      // If no transcripts found anywhere, show empty state
      if (allTranscripts.length === 0) {
        setTranscripts([]);
        console.log('No transcripts found in localStorage or public folder');
      } else {
        // Sort transcripts properly
        allTranscripts.sort((a, b) => {
          const aNum = parseInt(a.id.replace('t', ''), 10);
          const bNum = parseInt(b.id.replace('t', ''), 10);
          return aNum - bNum;
        });
        
        // Load actual lesson titles for all transcripts
        console.log('Loading lesson titles for transcripts...');
        const transcriptsWithTitles = await Promise.all(
          allTranscripts.map(async (transcript) => {
            const lessonTitle = await loadTranscriptContent(transcript.id);
            return {
              ...transcript,
              displayName: lessonTitle
            };
          })
        );
        
        setTranscripts(transcriptsWithTitles);
        console.log('Final transcript list with titles:', transcriptsWithTitles);
      }
    } catch (error) {
      console.error('Error loading transcripts:', error);
      setTranscripts([]);
    } finally {
      setLoading(false);
    }
  }, [loadTranscriptContent]);

  // Load visited transcripts from localStorage
  const loadVisitedTranscripts = () => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('visitedTranscripts');
      if (stored) {
        try {
          const visitedArray = JSON.parse(stored);
          setVisitedTranscripts(new Set(visitedArray));
        } catch (error) {
          console.error('Error loading visited transcripts:', error);
        }
      }
    }
  };

  // Mark transcript as visited
  const markTranscriptAsVisited = (transcriptId: string) => {
    const newVisited = new Set(visitedTranscripts);
    newVisited.add(transcriptId);
    setVisitedTranscripts(newVisited);
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('visitedTranscripts', JSON.stringify(Array.from(newVisited)));
    }
  };

  // Handle transcript click with visit tracking
  const handleTranscriptClick = (transcriptId: string) => {
    markTranscriptAsVisited(transcriptId);
    router.push(`/transcript/${transcriptId.replace('t', '')}`);
  };

  useEffect(() => {
    setMounted(true);
    loadTranscripts();
    loadVisitedTranscripts();
  }, [loadTranscripts]);

  const handleTranscriptUploaded = () => {
    // Refresh transcript list when a new transcript is uploaded
    loadTranscripts();
    
    // Auto-generate annotation columns for the new transcript if codebook exists
    setTimeout(() => {
      generateAnnotationColumnsForNewTranscripts();
    }, 500); // Small delay to ensure transcript data is saved first
  };
  
  // Function to automatically generate annotation columns for new transcripts if codebook exists
  const generateAnnotationColumnsForNewTranscripts = () => {
    try {
      const featureDefinitionsData = localStorage.getItem('feature-definitions');
      if (!featureDefinitionsData) {
        console.log('No codebook found, skipping auto-generation for new transcripts');
        return;
      }
      
      const featureDefinitions = JSON.parse(featureDefinitionsData);
      if (!featureDefinitions.categories || featureDefinitions.categories.length === 0) {
        console.log('No categories in codebook, skipping auto-generation for new transcripts');
        return;
      }
      
      console.log('Checking for new transcripts without annotation columns...');
      
      // Get all transcript IDs
      const storedTranscripts = localStorage.getItem('transcripts');
      if (!storedTranscripts) return;
      
             const parsedTranscripts = JSON.parse(storedTranscripts);
       const transcriptIds = parsedTranscripts.map((t: { id: string }) => t.id.replace('t', ''));
      
      // Check each transcript for existing annotation data
      transcriptIds.forEach((transcriptId: string) => {
        const annotationKey = `annotations-${transcriptId}`;
        const existingAnnotations = localStorage.getItem(annotationKey);
        
        if (!existingAnnotations) {
          console.log(`Generating annotation columns for new transcript ${transcriptId}...`);
          generateAnnotationColumnsForTranscript(transcriptId, featureDefinitions);
        }
      });
      
    } catch (error) {
      console.error('Error in auto-generation for new transcripts:', error);
    }
  };

  const handleFeatureDefinitionUploaded = () => {
    // Handle feature definition upload success
    console.log('Feature definition uploaded successfully - annotation columns regenerated');
    
    // Auto-generate annotation columns for any existing transcripts
    generateAnnotationColumnsForAllTranscripts();
    
    // Trigger refresh of feature definitions viewer
    setFeatureViewerRefreshTrigger(prev => prev + 1);
    
    // Show a notification to the user about the automatic generation
    alert('Feature definition uploaded successfully!\n\nAnnotation columns have been automatically generated for all transcripts based on the new codebook.\nPlease refresh any open transcript pages to see the new feature definitions.');
  };
  
  // Function to automatically generate annotation columns for all transcripts when codebook is updated
  const generateAnnotationColumnsForAllTranscripts = () => {
    try {
      const featureDefinitionsData = localStorage.getItem('feature-definitions');
      if (!featureDefinitionsData) {
        console.log('No codebook found, skipping auto-generation');
        return;
      }
      
      const featureDefinitions = JSON.parse(featureDefinitionsData);
      if (!featureDefinitions.categories || featureDefinitions.categories.length === 0) {
        console.log('No categories in codebook, skipping auto-generation');
        return;
      }
      
      console.log('Regenerating annotation columns for all transcripts...');
      
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
      
      // Regenerate annotation columns for each transcript
      transcriptIds.forEach(transcriptId => {
        generateAnnotationColumnsForTranscript(transcriptId, featureDefinitions);
      });
      
      console.log(`Successfully regenerated annotation columns for ${transcriptIds.length} transcripts`);
      
    } catch (error) {
      console.error('Error in auto-generation:', error);
    }
  };
  
  // Interface for feature definitions (matching the one in FeatureDefinitionUpload)
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

  // Function to generate annotation columns for a specific transcript
  const generateAnnotationColumnsForTranscript = (transcriptId: string, featureDefinitions: FeatureDefinitions) => {
    try {
      console.log(`Regenerating annotation columns for transcript ${transcriptId}...`);
      
      // Get table data for this transcript
      const tableDataKey = `tableData-${transcriptId}`;
      const existingTableData = localStorage.getItem(tableDataKey);
      
      if (!existingTableData) {
        console.log(`No table data found for transcript ${transcriptId}, skipping`);
        return;
      }
      
      const tableData = JSON.parse(existingTableData);
      const numRows = tableData.length;
      
      // Create annotation data structure based on the current codebook
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

  const handleDeleteTranscript = async (transcriptId: string, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent navigation when clicking delete
    
    if (!confirm(`Are you sure you want to delete transcript ${transcriptId}? This action cannot be undone.`)) {
      return;
    }
    
    setDeletingTranscript(transcriptId);
    
    try {
      // Check if this is a localStorage transcript
      const storedTranscripts = localStorage.getItem('transcripts');
      let isLocalStorageTranscript = false;
      
      if (storedTranscripts) {
        const parsedTranscripts = JSON.parse(storedTranscripts);
        isLocalStorageTranscript = parsedTranscripts.some((t: TranscriptInfo) => t.id === transcriptId);
      }
      
      if (isLocalStorageTranscript) {
        // Delete from localStorage
        if (storedTranscripts) {
          const parsedTranscripts = JSON.parse(storedTranscripts);
          const updatedTranscripts = parsedTranscripts.filter((t: TranscriptInfo) => t.id !== transcriptId);
          localStorage.setItem('transcripts', JSON.stringify(updatedTranscripts));
          
          // Also delete all related localStorage data
          const keysToDelete = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`${transcriptId}-`)) {
              keysToDelete.push(key);
            }
          }
          keysToDelete.forEach(key => localStorage.removeItem(key));
          
          // Delete annotation data
          localStorage.removeItem(`annotations-${transcriptId.replace('t', '')}`);
          localStorage.removeItem(`tableData-${transcriptId.replace('t', '')}`);
          localStorage.removeItem(`notes-${transcriptId.replace('t', '')}`);
          localStorage.removeItem(`nextNoteId-${transcriptId.replace('t', '')}`);
          localStorage.removeItem(`availableIds-${transcriptId.replace('t', '')}`);
          
          console.log(`Deleted localStorage transcript ${transcriptId} and related data`);
        }
      } else {
        // Try to delete from server (public folder)
        const response = await fetch('/api/delete-transcript', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ transcriptId }),
        });
        
        const data = await response.json();
        
        if (!data.success) {
          alert(`Error deleting transcript: ${data.error}`);
          return;
        }
        
        console.log(`Deleted public folder transcript ${transcriptId}`);
      }
      
      // Refresh transcript list after successful deletion
      await loadTranscripts();
      
    } catch (error) {
      console.error('Error deleting transcript:', error);
      alert('Error deleting transcript');
    } finally {
      setDeletingTranscript(null);
    }
  };

  const handleDownloadAllAnnotations = async () => {
    setDownloadingAll(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      
      // Get feature definitions
      const featureDefinitionsData = await safeStorageGet('feature-definitions');
      let featureDefinitions: { features?: Record<string, Array<{ id: string; name: string; type: string }>> } = {};
      if (featureDefinitionsData) {
        featureDefinitions = JSON.parse(featureDefinitionsData);
      }

      let processedCount = 0;
      
      for (const transcript of transcripts) {
        try {
          const transcriptNumber = transcript.id.replace('t', '');
          
          // Load annotation data
          const annotationDataRaw = await safeStorageGet(`annotations-${transcriptNumber}`);
          if (!annotationDataRaw) {
            console.log(`No annotation data found for ${transcript.id}`);
            continue;
          }

          const annotationData = JSON.parse(annotationDataRaw);
          
          // Create Excel workbook
          const workbook = XLSX.utils.book_new();
          
          // Process each category
          Object.keys(annotationData).forEach(category => {
            const categoryData = annotationData[category];
            const categoryFeatures = featureDefinitions.features?.[category] || [];
            
            // Prepare data for Excel
            const excelData: (string | number)[][] = [];
            
            // Add header row
            const headerRow = ['Row', 'Speaker', 'Dialogue'];
            categoryFeatures.forEach((feature) => {
              headerRow.push(feature.name);
            });
            excelData.push(headerRow);
            
            // Add data rows
            Object.keys(categoryData).forEach(rowId => {
              const rowData = categoryData[rowId];
              const row = [
                rowData.row || rowId,
                rowData.speaker || '',
                rowData.dialogue || ''
              ];
              
              // Add feature annotations
              categoryFeatures.forEach((feature) => {
                const annotation = rowData.annotations?.[feature.id];
                if (feature.type === 'multiple_choice' && annotation) {
                  row.push(annotation.join(', '));
                } else if (feature.type === 'text' && annotation) {
                  row.push(annotation);
                } else {
                  row.push('');
                }
              });
              
              excelData.push(row);
            });
            
            // Create worksheet
            const worksheet = XLSX.utils.aoa_to_sheet(excelData);
            XLSX.utils.book_append_sheet(workbook, worksheet, category);
          });
          
          // Generate Excel file buffer
          const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
          
          // Add to zip
          zip.file(`${transcript.id}_annotations.xlsx`, excelBuffer);
          processedCount++;
          
        } catch (error) {
          console.error(`Error processing ${transcript.id}:`, error);
        }
      }
      
      if (processedCount === 0) {
        alert('No annotated transcripts found to download.');
        return;
      }
      
      // Generate zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Download zip file
      const url = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `all_annotated_transcripts_${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      alert(`Successfully downloaded ${processedCount} annotated transcripts.`);
      
    } catch (error) {
      console.error('Error downloading annotations:', error);
      alert('Error downloading annotations. Please try again.');
    } finally {
      setDownloadingAll(false);
    }
  };

  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <h1 className="text-3xl font-bold mb-8 text-black">Transcript Viewer</h1>
        <div className="flex flex-col space-y-4">
          <div className="px-8 py-3 bg-gray-300 text-gray-500 font-semibold rounded-md w-64 text-center">
            Loading...
          </div>
        </div>
      </div>
    );
  }

  // Separate transcripts by type (keeping for potential future use)
  // const originalTranscripts = transcripts.filter(t => !t.isNew);
  // const newTranscripts = transcripts.filter(t => t.isNew);

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Header with Title and Actions */}
      <div className="relative flex justify-end items-center mb-8">
        {/* Icon positioned independently */}
        <Image 
          src="/Icon.png" 
          alt="EduCoder" 
          width={320}
          height={320}
          className="fixed left-4 -top-8 h-80 w-auto z-0"
        />
        
        {/* Top Right Actions */}
        <div className="flex items-center gap-3">
          {/* Download All Annotations Button */}
          <button
            onClick={handleDownloadAllAnnotations}
            disabled={downloadingAll}
            className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {downloadingAll ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Download All Annotations</span>
              </>
            )}
          </button>

          {/* Zip Upload Button */}
          <button
            onClick={() => setShowZipUpload(!showZipUpload)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
            Upload to Cloud
          </button>

          {/* Settings Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
              <svg className={`w-4 h-4 transition-transform ${showSettings ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {/* Settings Dropdown */}
            {showSettings && (
              <Settings 
                isOpen={showSettings} 
                onClose={() => setShowSettings(false)} 
              />
            )}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div className="mb-8 text-center space-y-4">
        <div className="flex justify-center space-x-4 flex-wrap gap-2">
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="px-6 py-3 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition flex items-center gap-2"
          >
            <span>+</span>
            <span>Add New Transcript</span>
          </button>
          
          <button
            onClick={() => setShowFeatureUpload(!showFeatureUpload)}
            className="px-6 py-3 bg-purple-500 text-white font-semibold rounded-md hover:bg-purple-600 transition flex items-center gap-2"
          >
            <span>+</span>
            <span>Add Feature Definition</span>
          </button>
          
          <button
            onClick={() => setShowFeatureViewer(true)}
            className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>View Feature Definitions</span>
          </button>

          

        </div>
      </div>

      {/* Upload Sections */}
      {showUpload && (
        <div className="mb-8 max-w-2xl mx-auto">
          <TranscriptUpload onUploadSuccess={handleTranscriptUploaded} />
        </div>
      )}
      
      {showFeatureUpload && (
        <div className="mb-8 max-w-2xl mx-auto">
          <FeatureDefinitionUpload onUploadSuccess={handleFeatureDefinitionUploaded} />
        </div>
      )}
      
      {showZipUpload && (
        <div className="mb-8 max-w-2xl mx-auto">
          <ZipUpload transcripts={transcripts} onUploadSuccess={() => console.log('Zip uploaded successfully')} />
        </div>
      )}

      {/* Transcripts Grid */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">Available Transcripts</h2>
        
        {loading ? (
          <div className="text-center">
            <div className="inline-block px-8 py-3 bg-gray-300 text-gray-500 font-semibold rounded-md">
              Loading transcripts...
            </div>
          </div>
        ) : transcripts.length === 0 ? (
          <div className="text-center">
            <div className="inline-block px-8 py-3 bg-gray-100 text-gray-600 font-medium rounded-md">
              No transcripts available
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {transcripts.map((transcript, index) => {
              // Create a diverse color palette for each transcript
              const colorVariants = [
                'from-blue-500 via-purple-500 to-indigo-600',
                'from-emerald-400 via-teal-500 to-cyan-600',
                'from-rose-400 via-pink-500 to-purple-600',
                'from-amber-400 via-orange-500 to-red-500',
                'from-violet-500 via-purple-500 to-pink-500',
                'from-green-400 via-emerald-500 to-teal-600',
                'from-blue-600 via-indigo-500 to-purple-600',
                'from-orange-400 via-red-500 to-pink-500',
                'from-cyan-400 via-blue-500 to-indigo-600',
                'from-lime-400 via-green-500 to-emerald-600',
                'from-fuchsia-400 via-purple-500 to-violet-600',
                'from-yellow-400 via-orange-500 to-red-500'
              ];
              
              const gradientClass = colorVariants[index % colorVariants.length];
              
              // Check if this transcript should show the "New" badge
              const isUnvisitedNew = transcript.isNew && !visitedTranscripts.has(transcript.id);
              
              return (
                <div key={transcript.id} className="relative group">
                  <button 
                    onClick={() => handleTranscriptClick(transcript.id)}
                    disabled={deletingTranscript === transcript.id}
                    className={`w-full p-6 text-white font-medium rounded-xl transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 text-center relative overflow-hidden ${
                      deletingTranscript === transcript.id 
                        ? 'bg-gray-400 cursor-not-allowed scale-95' 
                        : `bg-gradient-to-br ${gradientClass} hover:shadow-xl`
                    }`}
                  >
                    {/* Background pattern overlay */}
                    <div className="absolute inset-0 bg-white/10 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent_50%)]"></div>
                    
                    {/* Content */}
                    <div className="relative z-10">
                      {/* Transcript ID */}
                      <div className="text-xs font-semibold mb-2 opacity-90 tracking-wider uppercase">
                        {transcript.id}
                      </div>
                      
                      {/* Icon */}
                      <div className="mb-3">
                        <svg className="w-8 h-8 mx-auto opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      
                      {/* Display Name */}
                      <div className="text-sm font-medium leading-tight">
                        {deletingTranscript === transcript.id ? (
                          <div className="flex items-center justify-center gap-2">
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Deleting...
                          </div>
                        ) : (
                          transcript.displayName
                        )}
                      </div>
                      
                      {/* New badge for unvisited new transcripts */}
                      {isUnvisitedNew && !deletingTranscript && (
                        <div className="mt-2">
                          <span className="inline-block px-2 py-1 text-xs font-semibold bg-white/20 rounded-full backdrop-blur-sm">
                            ✨ New
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>
                  </button>
                  
                  {/* Delete Button */}
                  <button
                    onClick={(e) => handleDeleteTranscript(transcript.id, e)}
                    disabled={deletingTranscript === transcript.id}
                    className="absolute top-3 right-3 w-7 h-7 bg-red-500/80 backdrop-blur-sm hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-110 shadow-lg"
                    title="Delete transcript"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feature Definitions Viewer */}
      <FeatureDefinitionsViewer 
        isOpen={showFeatureViewer} 
        onClose={() => setShowFeatureViewer(false)} 
        refreshTrigger={featureViewerRefreshTrigger}
      />

    </div>
  );
}