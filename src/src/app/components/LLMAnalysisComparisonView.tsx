"use client";

import React, { useState, useEffect } from 'react';

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

interface LLMAnalysisData {
  notes: Record<string, unknown>[];
  transcript: Record<string, unknown>[];
}

interface LLMAnalysisComparisonViewProps {
  number: string;
  tableData: TableRow[];
  userNotes: Note[];
  llmAnalysisData: LLMAnalysisData | null;
  onBack: () => void;
  speakerColors: { [key: string]: string };
  whichSegment: string;
}

interface FloatingWindowData {
  id: string;
  lineNumber: number;
  userNotes: Array<{title: string, content: string}>;
  llmNotes: Array<{llm: string, abstract: string, fullContent: string}>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  zIndex: number;
}

interface FloatingWindowProps {
  window: FloatingWindowData;
  onClose: (windowId: string) => void;
  onMinimize: (windowId: string) => void;
  onBringToFront: (windowId: string) => void;
  onUpdatePosition: (windowId: string, newPosition: { x: number; y: number }) => void;
}

function FloatingWindow({ window, onClose, onMinimize, onBringToFront, onUpdatePosition }: FloatingWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    onBringToFront(window.id);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newPosition = {
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        };
        onUpdatePosition(window.id, newPosition);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset, window.id, onUpdatePosition]);

  return (
    <div
      className="fixed bg-white border-2 border-gray-800 rounded-lg shadow-2xl overflow-hidden"
      style={{
        left: window.position.x,
        top: window.position.y,
        width: window.size.width,
        height: window.isMinimized ? 'auto' : window.size.height,
        zIndex: window.zIndex,
        minWidth: '300px',
        maxWidth: '90vw',
        maxHeight: '90vh'
      }}
    >
      {/* Window Header */}
      <div
        className="bg-gradient-to-r from-pink-600 to-pink-700 text-white px-4 py-2 cursor-move select-none flex items-center justify-between"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold">🤖 LLM Analysis - Line {window.lineNumber}</span>
          <span className="text-xs bg-pink-800 px-2 py-1 rounded">
            {window.userNotes.length + window.llmNotes.length} note{(window.userNotes.length + window.llmNotes.length) !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onMinimize(window.id)}
            className="text-white hover:bg-pink-800 w-6 h-6 rounded flex items-center justify-center text-sm"
            title={window.isMinimized ? "Maximize" : "Minimize"}
          >
            {window.isMinimized ? '□' : '−'}
          </button>
          <button
            onClick={() => onClose(window.id)}
            className="text-white hover:bg-red-600 w-6 h-6 rounded flex items-center justify-center text-sm"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {!window.isMinimized && (
        <div className="p-4 overflow-y-auto" style={{ height: window.size.height - 60 }}>
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              🤖 LLM Analysis for Line {window.lineNumber}
            </h4>
            <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mb-4">
              <div className="text-sm text-pink-800 flex items-center justify-between">
                <div>
                  <strong>Summary:</strong> {window.userNotes.length > 0 ? `${window.userNotes.length} user note${window.userNotes.length > 1 ? 's' : ''}` : 'No user notes'}{window.llmNotes.length > 0 ? `, ${window.llmNotes.length} LLM note${window.llmNotes.length > 1 ? 's' : ''}` : ''}
                </div>
                {(window.userNotes.length + window.llmNotes.length) > 1 && (
                  <div className="flex items-center gap-2">
                    <div className="text-xs bg-pink-200 text-pink-700 px-2 py-1 rounded-full">
                      {window.userNotes.length > 0 && 'You'}{window.userNotes.length > 0 && window.llmNotes.length > 0 && ' • '}{window.llmNotes.map(note => note.llm).join(' • ')}
                    </div>
                    <div className="text-xs text-pink-600 flex items-center gap-1">
                      ↔️ Scroll horizontally
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes Display - Horizontal Layout */}
          <div className="flex gap-4 overflow-x-auto pb-4">
            {/* User Notes */}
            {window.userNotes.map((note, index) => (
              <div key={`user-${index}`} className="flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden shadow-sm" style={{ minWidth: '300px', maxWidth: '350px' }}>
                {/* User Header */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-3 py-2">
                  <h5 className="font-semibold text-blue-800 text-sm flex flex-col items-center gap-1">
                    <span className="flex items-center gap-1">
                      👤 Your Note
                    </span>
                    <span className="text-xs bg-blue-200 text-blue-700 px-2 py-1 rounded-full">
                      User {index + 1} of {window.userNotes.length}
                    </span>
                  </h5>
                </div>
                
                {/* Note Content */}
                <div className="p-3 h-full">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">📌 Note Title</h6>
                    <div className="bg-blue-100 text-blue-800 px-2 py-2 rounded-lg text-xs border-l-4 border-blue-400">
                      {note.title}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">📄 Content</h6>
                    <div className="bg-gray-50 border rounded-lg p-3 text-gray-700 leading-relaxed text-xs border-l-4 border-gray-300 max-h-80 overflow-y-auto">
                      {note.content}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* LLM Notes */}
            {window.llmNotes.map((note, index) => (
              <div key={`llm-${index}`} className="flex-shrink-0 border border-gray-200 rounded-lg overflow-hidden shadow-sm" style={{ minWidth: '300px', maxWidth: '350px' }}>
                {/* LLM Header */}
                <div className="bg-gradient-to-r from-pink-50 to-pink-100 border-b border-pink-200 px-3 py-2">
                  <h5 className="font-semibold text-pink-800 text-sm flex flex-col items-center gap-1">
                    <span className="flex items-center gap-1">
                      🤖 {note.llm}
                    </span>
                    <span className="text-xs bg-pink-200 text-pink-700 px-2 py-1 rounded-full">
                      LLM {index + 1} of {window.llmNotes.length}
                    </span>
                  </h5>
                </div>
                
                {/* Note Content */}
                <div className="p-3 h-full">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">📌 Note Title</h6>
                    <div className="bg-pink-100 text-pink-800 px-2 py-2 rounded-lg text-xs border-l-4 border-pink-400">
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

export default function LLMAnalysisComparisonView({
  number,
  tableData,
  userNotes,
  llmAnalysisData,
  onBack,
  speakerColors,
  whichSegment
}: LLMAnalysisComparisonViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currentSearchMatch, setCurrentSearchMatch] = useState<number>(-1);
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [showOnlyWithNotes, setShowOnlyWithNotes] = useState(false);
  const [hoveredNote, setHoveredNote] = useState<{
    title: string;
    content: string;
    position: { x: number; y: number };
  } | null>(null);
  
  const [floatingWindows, setFloatingWindows] = useState<FloatingWindowData[]>([]);
  const [nextZIndex, setNextZIndex] = useState(1000);

  // Get LLM columns from the transcript data
  const llmColumns = llmAnalysisData?.transcript && llmAnalysisData.transcript.length > 0
    ? Object.keys(llmAnalysisData.transcript[0]).filter(key => 
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

  // Get user notes for a specific line
  const getUserNotesForLine = (lineNumber: number): Note[] => {
    const rowIndex = tableData.findIndex(row => row.col2 === lineNumber);
    if (rowIndex === -1) return [];
    return userNotes.filter(note => note.rowIndices.includes(rowIndex));
  };

  // Get LLM note title for a specific line and LLM
  const getLLMNoteForLine = (lineNumber: number, llmColumn: string): string => {
    if (!llmAnalysisData?.transcript) return '';
    
    const transcriptRow = llmAnalysisData.transcript.find(row => {
      const lineCol = row['Line #'] || row['#'] || row['Line'] || row['line'] || row['LINE'];
      return lineCol !== null && lineCol !== undefined && String(lineCol) === String(lineNumber);
    });
    
    if (!transcriptRow) return '';
    
    const llmNote = transcriptRow[llmColumn];
    return llmNote ? String(llmNote).trim() : '';
  };

  // Get note content for an abstract
  const getNoteContent = (abstract: string, llmColumn: string): { abstract: string; fullContent: string } => {
    if (!llmAnalysisData?.notes || !abstract || !llmColumn) {
      return { abstract: abstract || '', fullContent: '' };
    }
    
    for (let i = 0; i < llmAnalysisData.notes.length; i++) {
      const noteRow = llmAnalysisData.notes[i];
      const llmCellData = noteRow[llmColumn];
      
      if (typeof llmCellData === 'string' && llmCellData.trim()) {
        const cellContent = llmCellData.trim();
        const parts = cellContent.split('||');
        
        if (parts.length >= 2) {
          const cellAbstract = parts[0].trim();
          const cellFullContent = parts[1].trim();
          
          if (cellAbstract === abstract.trim() || cellAbstract.includes(abstract.trim()) || abstract.trim().includes(cellAbstract)) {
            return {
              abstract: cellAbstract,
              fullContent: cellFullContent
            };
          }
        }
      }
    }
    
    return { abstract: abstract || '', fullContent: 'Content not found in the notes sheet.' };
  };

  // Filter table data based on segment and notes filter
  const filteredTableData = tableData.filter(rowData => {
    let passesSegmentFilter = true;
    if (whichSegment === 'student_only') {
      passesSegmentFilter = rowData.col5.includes('Student');
    } else {
      passesSegmentFilter = whichSegment === 'full_transcript' || rowData.col1 === whichSegment;
    }
    
    if (!passesSegmentFilter) return false;
    
    if (showOnlyWithNotes) {
      const userNotesForLine = getUserNotesForLine(rowData.col2);
      const hasUserNotes = userNotesForLine.length > 0;
      
      const hasLLMNotes = llmColumns.some(llmCol => 
        getLLMNoteForLine(rowData.col2, llmCol)
      );
      
      return hasUserNotes || hasLLMNotes;
    }
    
    return true;
  });

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
    const isLineNumber = /^\d+$/.test(term.trim());
    
    filteredTableData.forEach((row, index) => {
      if (isLineNumber) {
        if (row.col2.toString() === term.trim()) {
          matches.push(index);
        }
      } else {
        if (row.col6.toLowerCase().includes(searchLower)) {
          matches.push(index);
        }
      }
    });
    
    setSearchMatches(matches);
    setCurrentSearchMatch(matches.length > 0 ? 0 : -1);
    
    if (matches.length > 0) {
      scrollToMatch(matches[0]);
    }
  };

  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;
    
    let newIndex = currentSearchMatch;
    if (direction === 'next') {
      newIndex = (currentSearchMatch + 1) % searchMatches.length;
    } else {
      newIndex = currentSearchMatch <= 0 ? searchMatches.length - 1 : currentSearchMatch - 1;
    }
    
    setCurrentSearchMatch(newIndex);
    scrollToMatch(searchMatches[newIndex]);
  };

  const scrollToMatch = (tableIndex: number) => {
    const element = document.querySelector(`tr[data-row-index="${tableIndex}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchMatches([]);
    setCurrentSearchMatch(-1);
  };

  const createWindowId = (lineNumber: number): string => {
    return `llm-analysis-line-${lineNumber}`;
  };

  const calculateInitialPosition = (): { x: number; y: number } => {
    const baseX = 100;
    const baseY = 100;
    const offset = floatingWindows.length * 30;
    
    return {
      x: baseX + offset,
      y: baseY + offset
    };
  };

  const handleLLMNoteClick = (abstract: string, llmColumn: string, llmName: string, event?: React.MouseEvent) => {
    if (event) {
      event.stopPropagation();
    }
    
    let lineNumber: number | null = null;
    for (const rowData of filteredTableData) {
      const llmNote = getLLMNoteForLine(rowData.col2, llmColumn);
      if (llmNote === abstract) {
        lineNumber = rowData.col2;
        break;
      }
    }

    if (lineNumber !== null) {
      handleRowClick(lineNumber);
    }
  };

  const handleRowClick = (lineNumber: number) => {
    const llmNotesForLine: Array<{llm: string, abstract: string, fullContent: string}> = [];
    const userNotesForLine: Array<{title: string, content: string}> = [];
    
    // Collect all LLM notes for this line
    llmColumns.forEach(llmCol => {
      const llmNote = getLLMNoteForLine(lineNumber, llmCol);
      if (llmNote) {
        const noteData = getNoteContent(llmNote, llmCol);
        if (noteData.fullContent) {
          llmNotesForLine.push({
            llm: llmCol,
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

    if (llmNotesForLine.length === 0 && userNotesForLine.length === 0) {
      return;
    }

    const windowId = createWindowId(lineNumber);
    
    const existingWindow = floatingWindows.find(w => w.id === windowId);
    if (existingWindow) {
      setFloatingWindows(prev => prev.map(w => 
        w.id === windowId 
          ? { ...w, zIndex: nextZIndex, isMinimized: false }
          : w
      ));
      setNextZIndex(prev => prev + 1);
      return;
    }

    const position = calculateInitialPosition();
    const totalNotes = userNotesForLine.length + llmNotesForLine.length;
    const newWindow: FloatingWindowData = {
      id: windowId,
      lineNumber: lineNumber,
      userNotes: userNotesForLine,
      llmNotes: llmNotesForLine,
      position,
      size: { 
        width: Math.min(400 + totalNotes * 200, 1200),
        height: 600
      },
      isMinimized: false,
      zIndex: nextZIndex
    };

    setFloatingWindows(prev => [...prev, newWindow]);
    setNextZIndex(prev => prev + 1);
  };

  const closeWindow = (windowId: string) => {
    setFloatingWindows(prev => prev.filter(w => w.id !== windowId));
  };

  const toggleMinimize = (windowId: string) => {
    setFloatingWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, isMinimized: !w.isMinimized } : w
    ));
  };

  const bringToFront = (windowId: string) => {
    setFloatingWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, zIndex: nextZIndex } : w
    ));
    setNextZIndex(prev => prev + 1);
  };

  const updateWindowPosition = (windowId: string, newPosition: { x: number; y: number }) => {
    setFloatingWindows(prev => prev.map(w => 
      w.id === windowId ? { ...w, position: newPosition } : w
    ));
  };

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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow border p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🤖 LLM Analysis Comparison
              </h1>
              <p className="text-gray-600">
                Transcript {number} • Your Notes vs LLM Analysis
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
                  ? 'bg-pink-500 text-white hover:bg-pink-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={showOnlyWithNotes ? 'Show all rows' : 'Show only rows with notes'}
            >
              {showOnlyWithNotes ? '🤖 Showing rows with notes' : '🤖 Show only rows with notes'}
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
            <div className="mb-4 p-3 bg-pink-50 border border-pink-200 rounded">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-pink-800">
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
                        : 'bg-pink-100 text-pink-800 border-pink-300'
                    }`}
                    onClick={() => {
                      if (window.isMinimized) {
                        toggleMinimize(window.id);
                      }
                      bringToFront(window.id);
                    }}
                    title={`Line ${window.lineNumber}: ${window.userNotes.length > 0 ? `${window.userNotes.length} user note${window.userNotes.length > 1 ? 's' : ''}` : ''}${window.userNotes.length > 0 && window.llmNotes.length > 0 ? ', ' : ''}${window.llmNotes.length > 0 ? `${window.llmNotes.length} LLM note${window.llmNotes.length > 1 ? 's' : ''}` : ''} (Click to ${window.isMinimized ? 'restore' : 'focus'})`}
                  >
                    <span className="font-medium">Line {window.lineNumber}</span>
                    <span className="ml-1 text-xs">
                      ({window.userNotes.length + window.llmNotes.length} note{(window.userNotes.length + window.llmNotes.length) > 1 ? 's' : ''})
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
                
                {/* LLM columns */}
                {llmColumns.map(llmCol => (
                  <th key={llmCol} className="px-4 py-3 text-sm font-medium text-white border border-gray-600">
                    🤖 {llmCol}
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
                
                const hasLLMNotes = llmColumns.some(llmCol => 
                  getLLMNoteForLine(rowData.col2, llmCol)
                );

                return (
                  <tr 
                    key={`llm-comparison-${filteredIndex}-${rowData.col2}`} 
                    data-row-index={originalIndex}
                    className={`${speakerColors[rowData.col5] || "bg-gray-50"} hover:bg-pink-50 hover:shadow-sm cursor-pointer transition-colors ${
                      isCurrentMatch ? 'ring-2 ring-yellow-400 bg-yellow-100' : 
                      isSearchMatch ? 'bg-yellow-50' : ''
                    }`}
                    onClick={() => handleRowClick(rowData.col2)}
                    title={hasLLMNotes ? "Click to open all LLM analysis notes for this line" : "No LLM analysis notes available for this line"}
                  >
                    <td className="px-4 py-2 border border-gray-300 text-sm text-black">
                      <div className="flex items-center gap-2">
                        {rowData.col2}
                        {hasLLMNotes && (
                          <span className="text-pink-600 text-xs" title="Has LLM analysis notes">🤖</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border border-gray-300 text-sm font-medium text-black">{rowData.col5}</td>
                    <td className="px-4 py-2 border border-gray-300 text-sm text-black">
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
                    </td>
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
                    
                    {/* LLM columns */}
                    {llmColumns.map(llmCol => {
                      const llmNote = getLLMNoteForLine(rowData.col2, llmCol);
                      
                      return (
                        <td key={llmCol} className="px-4 py-2 border border-gray-300 text-sm">
                          {llmNote ? (
                            <div
                              className="bg-pink-100 text-pink-800 px-2 py-1 rounded text-xs cursor-pointer"
                              onClick={(e) => handleLLMNoteClick(llmNote, llmCol, llmCol, e)}
                              title="Click to see full note content (or click row to open all)"
                            >
                              {llmNote}
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
              <div className="bg-pink-100 text-pink-800 px-3 py-1 rounded text-sm font-medium">🤖 LLM Analysis</div>
              <span className="text-gray-700">LLM analysis annotation</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <div className="bg-gray-400 text-white px-3 py-1 rounded text-sm font-medium">—</div>
              <span className="text-gray-700">No annotation</span>
            </div>
                          <div className="text-sm text-gray-600 space-y-1">
                <div><strong>Filter:</strong> Use the &quot;Show only rows with notes&quot; button to display only lines that have annotations</div>
              <div><strong>Row Click:</strong> Click any row to open a consolidated window with all notes (user + LLM analysis) for that line</div>
              <div><strong>Individual:</strong> Click specific user or LLM analysis notes to open the same consolidated window</div>
              <div><strong>Windows:</strong> Drag windows by their header, minimize/maximize with −/□, close with ×</div>
              <div><strong>Organization:</strong> User notes (blue) and LLM analysis notes (pink) are displayed side by side horizontally</div>
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
          onUpdatePosition={(windowId, newPosition) => updateWindowPosition(windowId, newPosition)}
        />
      ))}
    </div>
  );
} 