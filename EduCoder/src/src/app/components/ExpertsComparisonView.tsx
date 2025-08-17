"use client";

import React, { useState } from 'react';

interface TableRow {
  col1: string | null; // Segment (optional)
  col2: number;
  col3: string;
  col4: string;
  col5: string;
  col6: string;
  col7: string;
  noteIds: string;
  [key: string]: string | number | null; // For extra columns
}

interface Note {
  content_1: string;
  content_2: string;
  id: number;
  title: string;
  rowIndices: number[];
}

interface ExpertsData {
  notes: Record<string, unknown>[];
  transcript: Record<string, unknown>[];
}

interface ExpertsComparisonViewProps {
  number: string;
  tableData: TableRow[];
  userNotes: Note[];
  expertsData: ExpertsData | null;
  onBack: () => void;
  speakerColors: { [key: string]: string };
  whichSegment: string;
}

// Interface for floating windows
interface FloatingWindowData {
  id: string;
  lineNumber: number;
  userNotes: Array<{
    title: string;
    content: string;
  }>;
  expertNotes: Array<{
    expert: string;
    abstract: string;
    fullContent: string;
  }>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  zIndex: number;
}

// Props for the FloatingWindow component
interface FloatingWindowProps {
  window: FloatingWindowData;
  onClose: () => void;
  onMinimize: () => void;
  onBringToFront: () => void;
  onUpdatePosition: (position: { x: number; y: number }) => void;
}

// Draggable Floating Window Component
function FloatingWindow({ window, onClose, onMinimize, onBringToFront, onUpdatePosition }: FloatingWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only start dragging if clicking on the header
    if ((e.target as HTMLElement).closest('.window-header')) {
      setIsDragging(true);
      onBringToFront();
      
      const rect = e.currentTarget.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newPosition = {
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      };
      
      // Keep window within viewport bounds
      const maxX = globalThis.window.innerWidth - window.size.width;
      const maxY = globalThis.window.innerHeight - window.size.height;
      
      newPosition.x = Math.max(0, Math.min(newPosition.x, maxX));
      newPosition.y = Math.max(0, Math.min(newPosition.y, maxY));
      
      onUpdatePosition(newPosition);
    }
  }, [isDragging, dragOffset, window.size.width, window.size.height, onUpdatePosition]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add event listeners for dragging
  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-300 overflow-hidden"
              style={{
          left: window.position.x,
          top: window.position.y,
          width: window.size.width,
          height: window.isMinimized ? 'auto' : window.size.height,
          zIndex: window.zIndex,
          minWidth: '400px',
          maxWidth: '95vw'
        }}
      onMouseDown={handleMouseDown}
      onClick={onBringToFront}
    >
      {/* Window Header */}
      <div className="window-header bg-green-600 text-white px-4 py-3 flex items-center justify-between cursor-move select-none">
        <div className="flex items-center space-x-2">
          <div className="text-sm font-semibold truncate">
            Line {window.lineNumber} - {window.userNotes.length > 0 ? `${window.userNotes.length} user note${window.userNotes.length > 1 ? 's' : ''}` : 'No user notes'}{window.expertNotes.length > 0 ? `, ${window.expertNotes.length} expert note${window.expertNotes.length > 1 ? 's' : ''}` : ''}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className="text-white hover:text-gray-200 text-lg font-bold w-6 h-6 flex items-center justify-center"
            title={window.isMinimized ? "Maximize" : "Minimize"}
          >
            {window.isMinimized ? '□' : '−'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="text-white hover:text-gray-200 text-lg font-bold w-6 h-6 flex items-center justify-center"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Window Content */}
      {!window.isMinimized && (
        <div className="p-4 overflow-y-auto" style={{ height: window.size.height - 60 }}>
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              📝 Annotations for Line {window.lineNumber}
            </h4>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="text-sm text-blue-800 flex items-center justify-between">
                <div>
                  <strong>Summary:</strong> {window.userNotes.length > 0 ? `${window.userNotes.length} user note${window.userNotes.length > 1 ? 's' : ''}` : 'No user notes'}{window.expertNotes.length > 0 ? `, ${window.expertNotes.length} expert note${window.expertNotes.length > 1 ? 's' : ''}` : ''}
                </div>
                {(window.userNotes.length + window.expertNotes.length) > 1 && (
                  <div className="flex items-center gap-2">
                    <div className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                      {window.userNotes.length > 0 && 'You'}{window.userNotes.length > 0 && window.expertNotes.length > 0 && ' • '}{window.expertNotes.map(note => note.expert).join(' • ')}
                    </div>
                    <div className="text-xs text-blue-600 flex items-center gap-1">
                      ↔️ Scroll horizontally
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
            {/* User Notes */}
            {window.userNotes.map((note, index) => (
              <div key={`user-${index}`} className="flex-shrink-0 border border-blue-200 rounded-lg overflow-hidden shadow-sm" style={{ minWidth: '300px', maxWidth: '350px' }}>
                {/* User Header */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-3 py-2">
                  <h5 className="font-semibold text-blue-800 text-sm flex flex-col items-center gap-1">
                    <span className="flex items-center gap-1">
                      👤 You
                    </span>
                    <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                      User Note {index + 1} of {window.userNotes.length}
                    </span>
                  </h5>
                </div>
                
                {/* Note Content */}
                <div className="p-3 h-full">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">📌 Note Title</h6>
                    <div className="bg-blue-100 text-blue-800 px-2 py-2 rounded-lg text-xs border-l-4 border-blue-400">
                      {note.title || 'User Note'}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">📄 Note Content</h6>
                    <div className="bg-gray-50 border rounded-lg p-3 text-gray-700 leading-relaxed text-xs border-l-4 border-gray-300 max-h-80 overflow-y-auto">
                      {note.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Expert Notes */}
            {window.expertNotes.map((note, index) => (
              <div key={`expert-${index}`} className="flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden shadow-sm" style={{ minWidth: '300px', maxWidth: '350px' }}>
                {/* Expert Header */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-3 py-2">
                  <h5 className="font-semibold text-green-800 text-sm flex flex-col items-center gap-1">
                    <span className="flex items-center gap-1">
                      👤 {note.expert}
                    </span>
                    <span className="text-xs bg-green-200 text-green-700 px-2 py-1 rounded-full">
                      Expert {index + 1} of {window.expertNotes.length}
                    </span>
                  </h5>
                </div>
                
                {/* Note Content */}
                <div className="p-3 h-full">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">📌 Note Title</h6>
                    <div className="bg-green-100 text-green-800 px-2 py-2 rounded-lg text-xs border-l-4 border-green-400">
                      {note.abstract}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">📄 Full Content</h6>
                    <div className="bg-gray-50 border rounded-lg p-3 text-gray-700 leading-relaxed text-xs border-l-4 border-gray-300 max-h-80 overflow-y-auto">
                      {note.fullContent}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpertsComparisonView({
  number,
  tableData,
  userNotes,
  expertsData,
  onBack,
  speakerColors,
  whichSegment
}: ExpertsComparisonViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentSearchMatch, setCurrentSearchMatch] = useState<number>(-1);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [showOnlyWithNotes, setShowOnlyWithNotes] = useState(false);
  const [hoveredNote, setHoveredNote] = useState<{
    title: string;
    content: string;
    position: { x: number; y: number };
  } | null>(null);
  
  // Replace single modal with floating windows array
  const [floatingWindows, setFloatingWindows] = useState<FloatingWindowData[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1000);

  // Get expert columns from the transcript data
  const expertColumns = expertsData?.transcript && expertsData.transcript.length > 0
    ? Object.keys(expertsData.transcript[0]).filter(key => 
        key !== 'Line #' && 
        key !== 'Speaker' && 
        key !== 'Utterance' &&
        key !== '#' &&
        key !== 'Segment ID' &&
        key !== 'Line' &&
        !key.toLowerCase().includes('segment') &&
        !key.toLowerCase().includes('line')
      )
    : [];

  // Debug: log expert columns and sample data (only in development)
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.log('Expert columns detected:', expertColumns);
    if (expertsData?.transcript && expertsData.transcript.length > 0) {
      console.log('Sample transcript row:', expertsData.transcript[0]);
      console.log('All available columns in transcript:', Object.keys(expertsData.transcript[0]));
    }
    if (expertsData?.notes && expertsData.notes.length > 0) {
      console.log('Sample notes row:', expertsData.notes[0]);
      console.log('All available columns in notes:', Object.keys(expertsData.notes[0]));
    }
  }

  // Get user notes for a specific line
  const getUserNotesForLine = (lineNumber: number): Note[] => {
    // Find the array index for this line number
    const rowIndex = tableData.findIndex(row => row.col2 === lineNumber);
    if (rowIndex === -1) return [];
    
    // Filter notes that include this row index
    return userNotes.filter(note => note.rowIndices.includes(rowIndex));
  };

  // Get expert note title for a specific line and expert
  const getExpertNoteForLine = (lineNumber: number, expertColumn: string): string => {
    if (!expertsData?.transcript) return '';
    
    // Try different ways to match line numbers (string vs number, different column names)
    const transcriptRow = expertsData.transcript.find(row => {
      const lineCol = row['Line #'] || row['#'] || row['Line'] || row['line'] || row['LINE'];
      // Convert both to strings for comparison to handle type mismatches
      return lineCol !== null && lineCol !== undefined && String(lineCol) === String(lineNumber);
    });
    
    if (!transcriptRow) {
      // Debug: log what we're looking for vs what's available (only in development)
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log(`No match found for line ${lineNumber}. Available data:`, 
          expertsData.transcript.slice(0, 3).map(row => ({
            lineFields: {
              'Line #': row['Line #'],
              '#': row['#'],
              'Line': row['Line'],
              'line': row['line']
            },
            expertData: row[expertColumn]
          }))
        );
      }
      return '';
    }
    
    const expertNote = transcriptRow[expertColumn];
    return expertNote ? String(expertNote).trim() : '';
  };

  // Get note content for an abstract (finds the full content after "||")
  const getNoteContent = (abstract: string, expertColumn: string): { abstract: string; fullContent: string } => {
    if (!expertsData?.notes || !abstract || !expertColumn) {
      if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('getNoteContent: Missing data', { hasNotes: !!expertsData?.notes, abstract, expertColumn });
      }
      return { abstract: abstract || '', fullContent: '' };
    }
    
    // Debug logging (only in development and client-side)
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('=== getNoteContent Debug ===');
      console.log('Searching for abstract:', `"${abstract}"`);
      console.log('In expert column:', `"${expertColumn}"`);
      console.log('Total notes rows:', expertsData.notes.length);
      
      // Show all available data in this expert column first
      const allExpertData = expertsData.notes.map((row, i) => ({
        rowIndex: i,
        data: row[expertColumn]
      })).filter(item => item.data);
      
      console.log('All data in expert column:', allExpertData);
    }
    
    // Search through all rows in the "What Students Are Saying" sheet
    for (let i = 0; i < expertsData.notes.length; i++) {
      const noteRow = expertsData.notes[i];
      const expertCellData = noteRow[expertColumn];
      
      if (typeof expertCellData === 'string' && expertCellData.trim()) {
        const cellContent = expertCellData.trim();
        
        // Split by "||" to get abstract and full content
        const parts = cellContent.split('||');
        if (parts.length >= 2) {
          const cellAbstract = parts[0].trim();
          const cellFullContent = parts[1].trim();
          
          // Debug comparison (only in development)
          if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.log(`Row ${i}: Comparing "${abstract.trim()}" with "${cellAbstract}"`);
          }
          
          // Check if the abstract matches (exact match or contains)
          if (cellAbstract === abstract.trim() || cellAbstract.includes(abstract.trim()) || abstract.trim().includes(cellAbstract)) {
            if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
              console.log('✅ MATCH FOUND!', { 
                searchedAbstract: abstract,
                foundAbstract: cellAbstract, 
                fullContent: cellFullContent 
              });
            }
            return {
              abstract: cellAbstract,
              fullContent: cellFullContent
            };
          }
        } else {
          if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.log(`Row ${i}: No "||" separator found in: "${cellContent}"`);
          }
        }
      }
    }
    
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      console.log('❌ NO MATCH FOUND');
      console.log('Searched for:', `"${abstract}"`);
      console.log('In column:', `"${expertColumn}"`);
    }
    
    return { abstract: abstract || '', fullContent: 'Content not found in the "What Students Are Saying" sheet.' };
  };

  // Filter table data based on segment and notes filter
  const filteredTableData = tableData.filter(rowData => {
    // First apply segment filter
    let passesSegmentFilter = true;
    if (whichSegment === 'student_only') {
      passesSegmentFilter = rowData.col5.includes('Student');
    } else {
      passesSegmentFilter = whichSegment === 'full_transcript' || rowData.col1 === whichSegment;
    }
    
    if (!passesSegmentFilter) return false;
    
    // Then apply notes filter if enabled
    if (showOnlyWithNotes) {
      const userNotesForLine = getUserNotesForLine(rowData.col2);
      const hasUserNotes = userNotesForLine.length > 0;
      
      const hasExpertNotes = expertColumns.some(expertCol => 
        getExpertNoteForLine(rowData.col2, expertCol)
      );
      
      return hasUserNotes || hasExpertNotes;
    }
    
    return true;
  });

  // Create a unique window ID for a line
  const createWindowId = (lineNumber: number): string => {
    return `line-${lineNumber}`;
  };

  // Calculate initial position for new window (offset from existing windows)
  const calculateInitialPosition = (): { x: number; y: number } => {
    const baseX = 100;
    const baseY = 100;
    const offset = floatingWindows.length * 30;
    
    return {
      x: baseX + offset,
      y: baseY + offset
    };
  };

  // Handle note title click for expert notes - find the line number and open consolidated window
  const handleExpertNoteClick = (abstract: string, expertColumn: string, expertName: string, event?: React.MouseEvent) => {
    // Stop event propagation to prevent row click when clicking individual notes
    if (event) {
      event.stopPropagation();
    }
    
    // Find which line this expert note belongs to
    let lineNumber: number | null = null;
    for (const rowData of filteredTableData) {
      const expertNote = getExpertNoteForLine(rowData.col2, expertColumn);
      if (expertNote === abstract) {
        lineNumber = rowData.col2;
        break;
      }
    }

    // If we found the line number, open the consolidated window for that line
    if (lineNumber !== null) {
      handleRowClick(lineNumber);
    }
  };

    // Handle row click - open consolidated window for all notes on that line
  const handleRowClick = (lineNumber: number) => {
    const expertNotesForLine: Array<{expert: string, abstract: string, fullContent: string}> = [];
    const userNotesForLine: Array<{title: string, content: string}> = [];
    
    // Collect all expert notes for this line
    expertColumns.forEach(expertCol => {
      const expertNote = getExpertNoteForLine(lineNumber, expertCol);
      if (expertNote) {
        const noteData = getNoteContent(expertNote, expertCol);
        if (noteData.fullContent) {
          expertNotesForLine.push({
            expert: expertCol,
            abstract: noteData.abstract,
            fullContent: noteData.fullContent
          });
        }
      }
    });

    // Collect all user notes for this line
    const userNotesForThisLine = getUserNotesForLine(lineNumber);
    userNotesForThisLine.forEach(note => {
      userNotesForLine.push({
        title: note.title || `Note ${note.id}`,
        content: note.content_1 || 'No content available'
      });
    });

    // Only proceed if there are any notes for this line
    if (expertNotesForLine.length === 0 && userNotesForLine.length === 0) {
      return;
    }

    const windowId = createWindowId(lineNumber);
    
    // Check if window already exists
    const existingWindow = floatingWindows.find(w => w.id === windowId);
    if (existingWindow) {
      // Bring existing window to front and unminimize
      setFloatingWindows(prev => prev.map(w => 
        w.id === windowId 
          ? { ...w, zIndex: nextZIndex, isMinimized: false }
          : w
      ));
      setNextZIndex(prev => prev + 1);
      return;
    }

    // Create new consolidated window
    const position = calculateInitialPosition();
    const totalNotes = userNotesForLine.length + expertNotesForLine.length;
    const newWindow: FloatingWindowData = {
      id: windowId,
      lineNumber: lineNumber,
      userNotes: userNotesForLine,
      expertNotes: expertNotesForLine,
      position,
      size: { 
        width: Math.min(400 + totalNotes * 200, 1200), // Dynamic width based on total number of notes
        height: 600 // Fixed height for horizontal layout
      },
      isMinimized: false,
      zIndex: nextZIndex
    };

    setFloatingWindows(prev => [...prev, newWindow]);
    setNextZIndex(prev => prev + 1);
  };

  // Close a specific floating window
  const closeWindow = (windowId: string) => {
    setFloatingWindows(prev => prev.filter(w => w.id !== windowId));
  };

  // Minimize/maximize a window
  const toggleMinimize = (windowId: string) => {
    setFloatingWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, isMinimized: !w.isMinimized } : w
    ));
  };

  // Bring window to front
  const bringToFront = (windowId: string) => {
    setFloatingWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, zIndex: nextZIndex } : w
    ));
    setNextZIndex(prev => prev + 1);
  };

  // Update window position (for dragging)
  const updateWindowPosition = (windowId: string, newPosition: { x: number; y: number }) => {
    setFloatingWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, position: newPosition } : w
    ));
  };

  // Handle note title hover for user notes (keep existing functionality)
  const handleUserNoteHover = (noteTitle: string, content: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    
    setHoveredNote({
      title: noteTitle,
      content: content,
      position: {
        x: rect.right + 10,
        y: rect.top
      }
    });
  };

  // Search functionality
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setSearchMatches([]);
      setCurrentSearchMatch(-1);
      return;
    }

    const matches: number[] = [];
    const searchLower = term.toLowerCase();
    
    // Check if search term is a number (line number search)
    const isLineNumber = /^\d+$/.test(term.trim());
    
    filteredTableData.forEach((row) => {
      // Find the original table index for this row
      const originalIndex = tableData.findIndex(originalRow => originalRow.col2 === row.col2);
      
      if (isLineNumber) {
        // Search by line number
        if (row.col2.toString() === term.trim()) {
          matches.push(originalIndex);
        }
      } else {
        // Search by utterance text
        if (row.col6.toLowerCase().includes(searchLower)) {
          matches.push(originalIndex);
        }
      }
    });
    
    setSearchMatches(matches);
    setCurrentSearchMatch(matches.length > 0 ? 0 : -1);
    
    // Scroll to first match
    if (matches.length > 0) {
      scrollToMatch(matches[0]);
    }
  };

  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;
    
    let nextIndex = currentSearchMatch;
    if (direction === 'next') {
      nextIndex = (currentSearchMatch + 1) % searchMatches.length;
    } else {
      nextIndex = currentSearchMatch === 0 ? searchMatches.length - 1 : currentSearchMatch - 1;
    }
    
    setCurrentSearchMatch(nextIndex);
    scrollToMatch(searchMatches[nextIndex]);
  };

  const scrollToMatch = (tableIndex: number) => {
    const rowElement = document.querySelector(`[data-row-index="${tableIndex}"]`);
    if (rowElement) {
      // Find the scrollable container and scroll it
      const scrollContainer = rowElement.closest('.overflow-auto');
      if (scrollContainer) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const rowRect = rowElement.getBoundingClientRect();
        const scrollTop = scrollContainer.scrollTop + (rowRect.top - containerRect.top) - (containerRect.height / 2);
        scrollContainer.scrollTo({ top: scrollTop, behavior: 'smooth' });
      } else {
        rowElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchMatches([]);
    setCurrentSearchMatch(-1);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow border p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                👥 Expert Annotations Comparison
              </h1>
              <p className="text-gray-600">
                Transcript {number} • Your Notes vs Expert Notes
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium text-sm"
            >
              ← Back to Annotation
            </button>
          </div>

          {/* Filter Section */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setShowOnlyWithNotes(!showOnlyWithNotes)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showOnlyWithNotes
                  ? 'bg-blue-500 text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={showOnlyWithNotes ? 'Show all rows' : 'Show only rows with notes'}
            >
              {showOnlyWithNotes ? '📝 Showing rows with notes' : '📝 Show only rows with notes'}
            </button>
            <span className="text-sm text-gray-600">
              {showOnlyWithNotes 
                ? `${filteredTableData.length} rows with notes`
                : `${filteredTableData.length} total rows`
              }
            </span>
          </div>

          {/* Search Section */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-gray-600">Search:</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search utterances or line number..."
                className="px-3 py-1 border border-gray-300 rounded text-sm flex-1"
              />
              {searchMatches.length > 0 && (
                <>
                  <span className="text-sm text-gray-600">
                    {currentSearchMatch + 1} of {searchMatches.length}
                  </span>
                  <button
                    onClick={() => navigateSearch('prev')}
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                    title="Previous match"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => navigateSearch('next')}
                    className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                    title="Next match"
                  >
                    ↓
                  </button>
                </>
              )}
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  title="Clear search"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Window Management Panel */}
          {floatingWindows.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-blue-800">
                  Open Note Windows ({floatingWindows.length})
                </h4>
                <button
                  onClick={() => setFloatingWindows([])}
                  className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  title="Close all windows"
                >
                  Close All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {floatingWindows.map(window => (
                  <div
                    key={window.id}
                    className={`text-xs px-2 py-1 rounded border cursor-pointer ${
                      window.isMinimized 
                        ? 'bg-gray-200 text-gray-600 border-gray-300' 
                        : 'bg-green-100 text-green-800 border-green-300'
                    }`}
                    onClick={() => {
                      if (window.isMinimized) {
                        toggleMinimize(window.id);
                      }
                      bringToFront(window.id);
                    }}
                    title={`Line ${window.lineNumber}: ${window.userNotes.length > 0 ? `${window.userNotes.length} user note${window.userNotes.length > 1 ? 's' : ''}` : ''}${window.userNotes.length > 0 && window.expertNotes.length > 0 ? ', ' : ''}${window.expertNotes.length > 0 ? `${window.expertNotes.length} expert note${window.expertNotes.length > 1 ? 's' : ''}` : ''} (Click to ${window.isMinimized ? 'restore' : 'focus'})`}
                                      >
                      <span className="font-medium">Line {window.lineNumber}</span>
                      <span className="ml-1 text-xs">
                        ({window.userNotes.length + window.expertNotes.length} note{(window.userNotes.length + window.expertNotes.length) > 1 ? 's' : ''})
                      </span>
                      {window.isMinimized && <span className="ml-1 opacity-60">(minimized)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="overflow-auto max-h-[48rem] border">
          <table className="min-w-full table-auto border-collapse">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">Line #</th>
                <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">Speaker</th>
                <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">Utterance</th>
                <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">Your Notes</th>
                
                {/* Expert columns */}
                {expertColumns.map(expertCol => (
                  <th key={expertCol} className="px-4 py-3 text-sm font-medium text-white border border-gray-600">
                    {expertCol}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredTableData.map((rowData, filteredIndex) => {
                const originalIndex = tableData.findIndex(originalRow => originalRow.col2 === rowData.col2);
                const isSearchMatch = searchMatches.includes(originalIndex);
                const isCurrentMatch = currentSearchMatch >= 0 && searchMatches[currentSearchMatch] === originalIndex;
                const userNotesForLine = getUserNotesForLine(rowData.col2);
                
                // Check if this row has any expert notes
                const hasExpertNotes = expertColumns.some(expertCol => 
                  getExpertNoteForLine(rowData.col2, expertCol)
                );

                return (
                  <tr 
                    key={`expert-comparison-${filteredIndex}-${rowData.col2}`} 
                    data-row-index={originalIndex}
                    className={`${speakerColors[rowData.col5] || "bg-gray-50"} hover:bg-blue-50 hover:shadow-sm cursor-pointer transition-colors ${
                      isCurrentMatch ? 'ring-2 ring-yellow-400 bg-yellow-100' : 
                      isSearchMatch ? 'bg-yellow-50' : ''
                    }`}
                    onClick={() => handleRowClick(rowData.col2)}
                    title={hasExpertNotes ? "Click to open all expert notes for this line" : "No expert notes available for this line"}
                  >
                    <td className="px-4 py-2 border border-gray-300 text-sm text-black">
                      <div className="flex items-center gap-2">
                        {rowData.col2}
                        {hasExpertNotes && (
                          <span className="text-green-600 text-xs" title="Has expert notes">📝</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border border-gray-300 text-sm font-medium text-black">{rowData.col5}</td>
                    <td className="px-4 py-2 border border-gray-300 text-sm max-w-xs text-black">
                      <div className="truncate">
                        {isSearchMatch && searchTerm && !(/^\d+$/.test(searchTerm.trim())) ? (
                          <span dangerouslySetInnerHTML={{
                            __html: rowData.col6.replace(
                              new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'),
                              '<mark class="bg-yellow-300">$1</mark>'
                            )
                          }} />
                        ) : (
                          rowData.col6
                        )}
                      </div>
                    </td>
                    
                    {/* Your Notes column */}
                    <td className="px-4 py-2 border border-gray-300 text-sm">
                      {userNotesForLine.length > 0 ? (
                        <div className="space-y-1">
                          {userNotesForLine.map(note => (
                            <div
                              key={note.id}
                              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs cursor-pointer"
                              onMouseEnter={(e) => {
                                e.stopPropagation();
                                handleUserNoteHover(note.title || `Note ${note.id}`, note.content_1, e);
                              }}
                              onMouseLeave={() => setHoveredNote(null)}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRowClick(rowData.col2);
                              }}
                              title="Hover to see note content, click to open in window"
                            >
                              {note.title || `Note ${note.id}`}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    
                    {/* Expert columns */}
                    {expertColumns.map(expertCol => {
                      const expertNote = getExpertNoteForLine(rowData.col2, expertCol);
                      
                      return (
                        <td key={expertCol} className="px-4 py-2 border border-gray-300 text-sm">
                          {expertNote ? (
                            <div
                              className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs cursor-pointer"
                              onClick={(e) => handleExpertNoteClick(expertNote, expertCol, expertCol, e)}
                              title="Click to see full note content (or click row to open all)"
                            >
                              {expertNote}
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-6 bg-white rounded-lg shadow border p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          Legend & Guide
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-medium">Your Note</div>
              <span className="text-gray-700">Your annotation</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm font-medium">Expert Note</div>
              <span className="text-gray-700">Expert annotation</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-400 text-white px-3 py-1 rounded text-sm font-medium">—</div>
              <span className="text-gray-700">No annotation</span>
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div><strong>Filter:</strong> Use the &quot;Show only rows with notes&quot; button to display only lines that have annotations</div>
              <div><strong>Row Click:</strong> Click any row to open a consolidated window with all notes (user + expert) for that line</div>
              <div><strong>Individual:</strong> Click specific user or expert notes to open the same consolidated window</div>
              <div><strong>Windows:</strong> Drag windows by their header, minimize/maximize with −/□, close with ×</div>
              <div><strong>Organization:</strong> User notes (blue) and expert notes (green) are displayed side by side horizontally</div>
            </div>
          </div>
        </div>
      </div>

      {/* Note Content Popup (for user notes) */}
      {hoveredNote && (
        <div 
          className="fixed bg-gray-800 text-white p-3 rounded shadow-lg z-50 max-w-sm"
          style={{
            left: hoveredNote.position.x,
            top: hoveredNote.position.y,
          }}
        >
          <div className="font-semibold text-sm mb-2">{hoveredNote.title}</div>
          <div className="text-xs">{hoveredNote.content || 'No content available'}</div>
        </div>
      )}

      {/* Floating Windows */}
      {floatingWindows.map(window => (
        <FloatingWindow
          key={window.id}
          window={window}
          onClose={() => closeWindow(window.id)}
          onMinimize={() => toggleMinimize(window.id)}
          onBringToFront={() => bringToFront(window.id)}
          onUpdatePosition={(newPosition) => updateWindowPosition(window.id, newPosition)}
        />
      ))}
    </div>
  );
} 