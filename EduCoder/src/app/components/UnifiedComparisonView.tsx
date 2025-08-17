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

interface ExpertsData {
  notes: Record<string, unknown>[];
  transcript: Record<string, unknown>[];
}

interface LLMAnalysisData {
  notes: Record<string, unknown>[];
  transcript: Record<string, unknown>[];
}

interface UnifiedComparisonViewProps {
  number: string;
  tableData: TableRow[];
  userNotes: Note[];
  expertsData: ExpertsData | null;
  llmAnalysisData: LLMAnalysisData | null;
  onBack: () => void;
  speakerColors: { [key: string]: string };
  whichSegment: string;
}

interface FloatingWindowData {
  id: string;
  lineNumber: number;
  evidence: { speaker: string; utterance: string };
  userNotes: Array<{title: string, abstract: string, fullContent: string}>;
  expertNotes: Array<{expert: string, abstract: string, fullContent: string}>;
  llmNotes: Array<{llm: string, abstract: string, fullContent: string}>;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isMinimized: boolean;
  isExpanded: boolean;
  zIndex: number;
}

interface FloatingWindowProps {
  window: FloatingWindowData;
  onClose: (windowId: string) => void;
  onMinimize: (windowId: string) => void;
  onExpand: (windowId: string) => void;
  onBringToFront: (windowId: string) => void;
  onUpdatePosition: (windowId: string, newPosition: { x: number; y: number }) => void;
}

function FloatingWindow({ window, onClose, onMinimize, onExpand, onBringToFront, onUpdatePosition }: FloatingWindowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.window-header')) {
      setIsDragging(true);
      onBringToFront(window.id);
      
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
      
      onUpdatePosition(window.id, newPosition);
    }
  }, [isDragging, dragOffset, window.size.width, window.size.height, onUpdatePosition, window.id]);

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
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

  const totalNotes = window.userNotes.length + window.expertNotes.length + window.llmNotes.length;

  const currentSize = window.isExpanded 
    ? { width: Math.min(1400, globalThis.window?.innerWidth * 0.9 || 1400), height: Math.min(900, globalThis.window?.innerHeight * 0.8 || 900) }
    : window.size;

  return (
    <div
      className="fixed bg-white rounded-lg shadow-2xl border border-gray-300 overflow-hidden"
      style={{
        left: window.position.x,
        top: window.position.y,
        width: currentSize.width,
        height: window.isMinimized ? 'auto' : currentSize.height,
        zIndex: window.zIndex,
        minWidth: '800px',
        maxWidth: '95vw'
      }}
      onMouseDown={handleMouseDown}
      onClick={() => onBringToFront(window.id)}
    >
      {/* Window Header */}
      <div className="window-header bg-purple-600 text-white px-4 py-3 flex items-center justify-between cursor-move select-none">
        <div className="flex items-center space-x-2">
          <div className="text-sm font-semibold truncate">
            Line {window.lineNumber} - {totalNotes} note{totalNotes !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize(window.id);
            }}
            className="text-white hover:text-gray-200 text-lg font-bold w-6 h-6 flex items-center justify-center"
            title={window.isMinimized ? "Maximize" : "Minimize"}
          >
            {window.isMinimized ? '□' : '−'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onExpand(window.id);
            }}
            className="text-white hover:text-gray-200 text-sm font-bold w-6 h-6 flex items-center justify-center"
            title={window.isExpanded ? "Shrink to normal size" : "Expand to larger size"}
          >
            {window.isExpanded ? '⇲' : '⇱'}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose(window.id);
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
        <div className="p-4 overflow-y-auto" style={{ height: currentSize.height - 60 }}>
          <div className="mb-4">
            <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
              📝 All Annotations for Line {window.lineNumber}
            </h4>
            
            {/* Evidence Section */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
              <h5 className="font-semibold text-orange-800 mb-2 flex items-center gap-2">
                🎯 Evidence
              </h5>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-orange-700 min-w-0 flex-shrink-0">Speaker:</span>
                  <span className="text-sm text-orange-800 font-medium">{window.evidence.speaker}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-orange-700 min-w-0 flex-shrink-0">Utterance:</span>
                  <span className="text-sm text-orange-800 leading-relaxed">{window.evidence.utterance}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
              <div className="text-sm text-purple-800 flex items-center justify-between">
                <div>
                  <strong>Summary:</strong> {window.userNotes.length} user, {window.expertNotes.length} expert, {window.llmNotes.length} LLM note{totalNotes !== 1 ? 's' : ''}
                </div>
                {totalNotes > 1 && (
                  <div className="flex items-center gap-2">
                    <div className="text-xs bg-purple-200 text-purple-700 px-2 py-1 rounded-full">
                      {window.userNotes.length > 0 && 'You'}
                      {window.userNotes.length > 0 && window.expertNotes.length > 0 && ' • '}
                      {window.expertNotes.map(note => note.expert).join(' • ')}
                      {(window.userNotes.length > 0 || window.expertNotes.length > 0) && window.llmNotes.length > 0 && ' • '}
                      {window.llmNotes.map(note => note.llm).join(' • ')}
                    </div>
                    <div className="text-xs text-purple-600 flex items-center gap-1">
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
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-blue-200 px-3 py-2">
                  <h5 className="font-semibold text-blue-800 text-sm flex items-center justify-center gap-1">
                    👤 Your Note
                  </h5>
                </div>
                <div className="p-3">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">Abstract</h6>
                    <div className="bg-blue-100 text-blue-800 px-2 py-2 rounded text-xs leading-relaxed">
                      {note.abstract}
                    </div>
                  </div>
                  <div>
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">Full Content</h6>
                    <div className="bg-gray-50 border rounded p-3 text-gray-700 text-xs leading-relaxed max-h-60 overflow-y-auto">
                      {note.fullContent}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Expert Notes */}
            {window.expertNotes.map((note, index) => (
              <div key={`expert-${index}`} className="flex-shrink-0 border border-green-200 rounded-lg overflow-hidden shadow-sm" style={{ minWidth: '300px', maxWidth: '350px' }}>
                <div className="bg-gradient-to-r from-green-50 to-green-100 border-b border-green-200 px-3 py-2">
                  <h5 className="font-semibold text-green-800 text-sm flex items-center justify-center gap-1">
                    🎓 {note.expert}
                  </h5>
                </div>
                <div className="p-3">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">Abstract</h6>
                    <div className="bg-green-100 text-green-800 px-2 py-2 rounded text-xs leading-relaxed">
                      {note.abstract}
                    </div>
                  </div>
                  <div>
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">Full Content</h6>
                    <div className="bg-gray-50 border rounded p-3 text-gray-700 text-xs leading-relaxed max-h-60 overflow-y-auto">
                      {note.fullContent}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* LLM Notes */}
            {window.llmNotes.map((note, index) => (
              <div key={`llm-${index}`} className="flex-shrink-0 border border-pink-200 rounded-lg overflow-hidden shadow-sm" style={{ minWidth: '300px', maxWidth: '350px' }}>
                <div className="bg-gradient-to-r from-pink-50 to-pink-100 border-b border-pink-200 px-3 py-2">
                  <h5 className="font-semibold text-pink-800 text-sm flex items-center justify-center gap-1">
                    🤖 {note.llm}
                  </h5>
                </div>
                <div className="p-3">
                  <div className="mb-3">
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">Abstract</h6>
                    <div className="bg-pink-100 text-pink-800 px-2 py-2 rounded text-xs leading-relaxed">
                      {note.abstract}
                    </div>
                  </div>
                  <div>
                    <h6 className="font-medium text-gray-700 text-xs uppercase tracking-wide mb-2">Full Content</h6>
                    <div className="bg-gray-50 border rounded p-3 text-gray-700 text-xs leading-relaxed max-h-60 overflow-y-auto">
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

export default function UnifiedComparisonView({
  number,
  tableData,
  userNotes,
  expertsData,
  llmAnalysisData,
  onBack,
  speakerColors,
  whichSegment
}: UnifiedComparisonViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchMatches, setSearchMatches] = useState<number[]>([]);
  const [currentSearchMatch, setCurrentSearchMatch] = useState<number>(0);
  const [floatingWindows, setFloatingWindows] = useState<FloatingWindowData[]>([]);
  const [nextZIndex, setNextZIndex] = useState<number>(1000);
  // Hide Expert columns by default for new transcripts (t996-t999) since they don't have Expert Notes
  const shouldHideExpertsByDefault = ['996', '997', '998', '999'].includes(number);
  const [showExperts, setShowExperts] = useState<boolean>(!shouldHideExpertsByDefault);
  const [showLLM, setShowLLM] = useState<boolean>(true);
  const [showOnlyWithNotes, setShowOnlyWithNotes] = useState<boolean>(false);





  // Get user notes for a specific line
  const getUserNotesForLine = (lineNumber: number): Note[] => {
    // Find the array index that corresponds to this line number
    const rowIndex = tableData.findIndex(row => row.col2 === lineNumber);
    if (rowIndex === -1) return [];
    
    // Filter notes that include this row index
    return userNotes.filter(note => note.rowIndices.includes(rowIndex));
  };

  // Get expert note for a specific line and expert column
  const getExpertNoteForLine = (lineNumber: number, expertColumn: string): string => {
    if (!expertsData?.transcript) return '';
    
    // Try different ways to match line numbers (same as ExpertsComparisonView)
    const transcriptRow = expertsData.transcript.find((row: Record<string, unknown>) => {
      const lineCol = row['Line #'] || row['#'] || row['Line'] || row['line'] || row['LINE'];
      return lineCol !== null && lineCol !== undefined && String(lineCol) === String(lineNumber);
    });
    
    if (!transcriptRow) return '';
    
    const expertNote = transcriptRow[expertColumn];
    return expertNote ? String(expertNote).trim() : '';
  };

  // Get LLM note for a specific line and LLM column
  const getLLMNoteForLine = (lineNumber: number, llmColumn: string): string => {
    if (!llmAnalysisData?.transcript) return '';
    
    // Try different ways to match line numbers (same as LLMAnalysisComparisonView)
    const transcriptRow = llmAnalysisData.transcript.find((row: Record<string, unknown>) => {
      const lineCol = row['Line #'] || row['#'] || row['Line'] || row['line'] || row['LINE'];
      return lineCol !== null && lineCol !== undefined && String(lineCol) === String(lineNumber);
    });
    
    if (!transcriptRow) return '';
    
    const llmNote = transcriptRow[llmColumn];
    return llmNote ? String(llmNote).trim() : '';
  };

  // Parse note content to extract abstract and full content
  // Get expert note content for an abstract (finds the full content after "||")
  const getExpertNoteContent = (abstract: string, expertColumn: string): { abstract: string; fullContent: string } => {
    if (!expertsData?.notes || !abstract || !expertColumn) {
      return { abstract: abstract || '', fullContent: '' };
    }
    
    // Search through all rows in the expert notes sheet
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
          
          // Check if the abstract matches (exact match or contains)
          if (cellAbstract === abstract.trim() || cellAbstract.includes(abstract.trim()) || abstract.trim().includes(cellAbstract)) {
            return {
              abstract: cellAbstract,
              fullContent: cellFullContent
            };
          }
        }
      }
    }
    
    return { abstract: abstract || '', fullContent: 'Content not found in the expert notes sheet.' };
  };

  // Get LLM note content for an abstract (finds the full content after "||")
  const getLLMNoteContent = (abstract: string, llmColumn: string): { abstract: string; fullContent: string } => {
    if (!llmAnalysisData?.notes || !abstract || !llmColumn) {
      return { abstract: abstract || '', fullContent: '' };
    }
    
    // Search through all rows in the LLM notes sheet
    for (let i = 0; i < llmAnalysisData.notes.length; i++) {
      const noteRow = llmAnalysisData.notes[i];
      const llmCellData = noteRow[llmColumn];
      
      if (typeof llmCellData === 'string' && llmCellData.trim()) {
        const cellContent = llmCellData.trim();
        
        // Split by "||" to get abstract and full content
        const parts = cellContent.split('||');
        if (parts.length >= 2) {
          const cellAbstract = parts[0].trim();
          const cellFullContent = parts[1].trim();
          
          // Check if the abstract matches (exact match or contains)
          if (cellAbstract === abstract.trim() || cellAbstract.includes(abstract.trim()) || abstract.trim().includes(cellAbstract)) {
            return {
              abstract: cellAbstract,
              fullContent: cellFullContent
            };
          }
        }
      }
    }
    
    return { abstract: abstract || '', fullContent: 'Content not found in the LLM notes sheet.' };
  };



  // Handle search functionality
  const handleSearch = (term: string) => {
    setSearchTerm(term);
    
    if (!term.trim()) {
      setSearchMatches([]);
      setCurrentSearchMatch(0);
      return;
    }
    
    const matches: number[] = [];
    const searchLower = term.toLowerCase();
    
    // Check if it's a line number search
    const lineNumber = parseInt(term);
    if (!isNaN(lineNumber)) {
      const matchingRow = tableData.find(row => row.col2 === lineNumber);
      if (matchingRow) {
        const tableIndex = tableData.indexOf(matchingRow);
        matches.push(tableIndex);
      }
    } else {
      // Text search in utterances
      tableData.forEach((row, index) => {
        if (row.col6.toLowerCase().includes(searchLower)) {
          matches.push(index);
        }
      });
    }
    
    setSearchMatches(matches);
    setCurrentSearchMatch(0);
    
    if (matches.length > 0) {
      scrollToMatch(matches[0]);
    }
  };

  const navigateSearch = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;
    
    let newIndex;
    if (direction === 'next') {
      newIndex = (currentSearchMatch + 1) % searchMatches.length;
    } else {
      newIndex = currentSearchMatch === 0 ? searchMatches.length - 1 : currentSearchMatch - 1;
    }
    
    setCurrentSearchMatch(newIndex);
    scrollToMatch(searchMatches[newIndex]);
  };

  const scrollToMatch = (tableIndex: number) => {
    const element = document.querySelector(`[data-row-index="${tableIndex}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchMatches([]);
    setCurrentSearchMatch(0);
  };

  // Floating window management
  const createWindowId = (lineNumber: number): string => {
    return `unified-window-${lineNumber}`;
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

  const handleRowClick = (lineNumber: number) => {
    const windowId = createWindowId(lineNumber);
    const existingWindow = floatingWindows.find(w => w.id === windowId);
    
    if (existingWindow) {
      bringToFront(windowId);
      return;
    }
    
    const userNotesForLine = getUserNotesForLine(lineNumber);
    
    // Collect all expert notes for this line
    const expertNotesForLine: Array<{expert: string, abstract: string, fullContent: string}> = [];
    ['Expert 1', 'Expert 2', 'Expert 3'].forEach(expertCol => {
      const expertNote = getExpertNoteForLine(lineNumber, expertCol);
      if (expertNote) {
        const noteData = getExpertNoteContent(expertNote, expertCol);
        if (noteData.fullContent) {
          expertNotesForLine.push({
            expert: expertCol,
            abstract: noteData.abstract,
            fullContent: noteData.fullContent
          });
        }
      }
    });
    
    // Collect all LLM notes for this line
    const llmNotesForLine: Array<{llm: string, abstract: string, fullContent: string}> = [];
    [{ col: 'Claude', displayName: 'LLM1 (Claude)' }, { col: 'ChatGPT', displayName: 'LLM2 (ChatGPT)' }].forEach(llm => {
      const llmNote = getLLMNoteForLine(lineNumber, llm.col);
      if (llmNote) {
        const noteData = getLLMNoteContent(llmNote, llm.col);
        if (noteData.fullContent) {
          llmNotesForLine.push({
            llm: llm.displayName,
            abstract: noteData.abstract,
            fullContent: noteData.fullContent
          });
        }
      }
    });
    
    const totalNotes = userNotesForLine.length + expertNotesForLine.length + llmNotesForLine.length;
    if (totalNotes === 0) return;
    
    // Find the utterance data for this line
    const rowData = tableData.find(row => row.col2 === lineNumber);
    const evidence = rowData ? { speaker: rowData.col5, utterance: rowData.col6 } : { speaker: '', utterance: '' };
    
    const newWindow: FloatingWindowData = {
      id: windowId,
      lineNumber,
      evidence,
      userNotes: userNotesForLine.map(note => ({
        title: note.title,
        abstract: note.content_1 || '',
        fullContent: note.content_2 || ''
      })),
      expertNotes: expertNotesForLine,
      llmNotes: llmNotesForLine,
      position: calculateInitialPosition(),
      size: { width: 1200, height: 800 },
      isMinimized: false,
      isExpanded: false,
      zIndex: nextZIndex
    };
    
    setFloatingWindows(prev => [...prev, newWindow]);
    setNextZIndex(prev => prev + 1);
  };

  const closeWindow = (windowId: string) => {
    setFloatingWindows(prev => prev.filter(w => w.id !== windowId));
  };

  const toggleMinimize = (windowId: string) => {
    setFloatingWindows(prev => 
      prev.map(w => w.id === windowId ? { ...w, isMinimized: !w.isMinimized } : w)
    );
  };

  const toggleExpand = (windowId: string) => {
    setFloatingWindows(prev => 
      prev.map(w => w.id === windowId ? { ...w, isExpanded: !w.isExpanded } : w)
    );
  };

  const bringToFront = (windowId: string) => {
    setFloatingWindows(prev => 
      prev.map(w => w.id === windowId ? { ...w, zIndex: nextZIndex } : w)
    );
    setNextZIndex(prev => prev + 1);
  };

  const updateWindowPosition = (windowId: string, newPosition: { x: number; y: number }) => {
    setFloatingWindows(prev => 
      prev.map(w => w.id === windowId ? { ...w, position: newPosition } : w)
    );
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
      
      const hasExpertNotes = ['Expert 1', 'Expert 2', 'Expert 3'].some(expertCol => 
        getExpertNoteForLine(rowData.col2, expertCol)
      );
      
      const hasLLMNotes = ['Claude', 'ChatGPT'].some(llmCol => 
        getLLMNoteForLine(rowData.col2, llmCol)
      );
      
      return hasUserNotes || hasExpertNotes || hasLLMNotes;
    }
    
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      {/* Header */}
      <div className="mb-6">
        <div className="bg-white rounded-lg shadow border p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                📚 Learning Notes Comparison
              </h1>
              <p className="text-gray-600">
                Transcript {number} • Your Notes vs Expert Notes vs LLM Analysis
              </p>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 font-medium text-sm"
            >
              ← Back to Transcript
            </button>
          </div>

          {/* Filter Section */}
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => setShowExperts(!showExperts)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showExperts
                  ? 'bg-green-500 text-white hover:bg-green-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={showExperts ? 'Hide expert notes columns' : 'Show expert notes columns'}
            >
              {showExperts ? '👥 Hide Experts\' Notes' : '👥 Show Only Experts\' Notes'}
            </button>
            <button
              onClick={() => setShowLLM(!showLLM)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                showLLM
                  ? 'bg-pink-500 text-white hover:bg-pink-600'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
              title={showLLM ? 'Hide LLM notes columns' : 'Show LLM notes columns'}
            >
              {showLLM ? '🤖 Hide LLM Notes' : '🤖 Show Only LLM Notes'}
            </button>
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
            <span className="text-sm text-black">
              {showOnlyWithNotes 
                ? `${filteredTableData.length} rows with notes`
                : `${filteredTableData.length} total rows`
              }
            </span>
          </div>

          {/* Search Section */}
          <div className="flex items-center gap-4 mb-4">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm text-black">Search:</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search utterances or line number..."
                className="px-3 py-1 border border-gray-300 rounded text-sm flex-1"
              />
              {searchMatches.length > 0 && (
                <>
                  <span className="text-sm text-black">
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
            <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-semibold text-indigo-800">
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
                        ? 'bg-gray-200 text-black border-gray-300' 
                        : 'bg-indigo-100 text-indigo-800 border-indigo-300'
                    }`}
                    onClick={() => {
                      if (window.isMinimized) {
                        toggleMinimize(window.id);
                      }
                      bringToFront(window.id);
                    }}
                    title={`Line ${window.lineNumber}: ${window.userNotes.length > 0 ? `${window.userNotes.length} user note${window.userNotes.length > 1 ? 's' : ''}` : ''}${window.userNotes.length > 0 && (window.expertNotes.length > 0 || window.llmNotes.length > 0) ? ', ' : ''}${window.expertNotes.length > 0 ? `${window.expertNotes.length} expert note${window.expertNotes.length > 1 ? 's' : ''}` : ''}${window.expertNotes.length > 0 && window.llmNotes.length > 0 ? ', ' : ''}${window.llmNotes.length > 0 ? `${window.llmNotes.length} LLM note${window.llmNotes.length > 1 ? 's' : ''}` : ''} (Click to ${window.isMinimized ? 'restore' : 'focus'})`}
                  >
                    <span className="font-medium">Line {window.lineNumber}</span>
                    <span className="ml-1 text-xs">
                      ({window.userNotes.length + window.expertNotes.length + window.llmNotes.length} note{(window.userNotes.length + window.expertNotes.length + window.llmNotes.length) > 1 ? 's' : ''})
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
      <div className="bg-white rounded-lg shadow border overflow-hidden w-full">
        <div className="overflow-auto max-h-[60rem] border w-full">
          <table className="w-full table-auto border-collapse">
            <thead className="bg-gray-700 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">Line #</th>
                <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">Speaker</th>
                <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600 max-w-xs">Utterance</th>
                <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">Your Notes</th>
                
                {/* Expert columns */}
                {showExperts && (
                  <>
                    <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">👥 Expert 1</th>
                    <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">👥 Expert 2</th>
                    <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">👥 Expert 3</th>
                  </>
                )}
                
                {/* LLM columns */}
                {showLLM && (
                  <>
                    <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">
                      🤖 LLM1 (Claude)
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-white border border-gray-600">
                      🤖 LLM2 (ChatGPT)
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {filteredTableData.map((rowData, filteredIndex) => {
                const isSearchMatch = searchMatches.includes(filteredIndex);
                const isCurrentMatch = currentSearchMatch >= 0 && searchMatches[currentSearchMatch] === filteredIndex;
                const userNotesForLine = getUserNotesForLine(rowData.col2);
                
                // Check if this row has any notes
                const hasExpertNotes = showExperts && ['Expert 1', 'Expert 2', 'Expert 3'].some(expertCol => 
                  getExpertNoteForLine(rowData.col2, expertCol)
                );
                const hasLLMNotes = showLLM && ['Claude', 'ChatGPT'].some(llmCol => 
                  getLLMNoteForLine(rowData.col2, llmCol)
                );
                const hasAnyNotes = userNotesForLine.length > 0 || hasExpertNotes || hasLLMNotes;

                return (
                  <tr 
                    key={`unified-comparison-${filteredIndex}-${rowData.col2}`} 
                    data-row-index={filteredIndex}
                    className={`${speakerColors[rowData.col5] || "bg-gray-50"} hover:bg-blue-50 hover:shadow-sm cursor-pointer transition-colors ${
                      isCurrentMatch ? 'ring-2 ring-yellow-400 bg-yellow-100' : 
                      isSearchMatch ? 'bg-yellow-50' : ''
                    }`}
                    onClick={() => handleRowClick(rowData.col2)}
                    title={hasAnyNotes ? "Click to open all notes for this line" : "No notes available for this line"}
                  >
                    <td className="px-4 py-2 border border-gray-300 text-sm text-black">
                      <div className="flex items-center gap-2">
                        {rowData.col2}
                        {hasAnyNotes && (
                          <span className="text-blue-600 text-xs" title="Has notes">📝</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 border border-gray-300 text-sm font-medium text-black">{rowData.col5}</td>
                    <td className="px-4 py-2 border border-gray-300 text-sm text-black max-w-xs">
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
                              className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1 cursor-pointer"
                              title={`${note.title}: ${note.content_1?.substring(0, 100)}${(note.content_1?.length || 0) > 100 ? '...' : ''}`}
                            >
                              {/* Show more text when other columns are hidden */}
                              {(() => {
                                const maxLength = (showExperts && showLLM) ? 15 : 30;
                                return note.title.length > maxLength ? note.title.substring(0, maxLength) + '...' : note.title;
                              })()}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                    
                    {/* Expert Notes columns */}
                    {showExperts && (
                      <>
                        {['Expert 1', 'Expert 2', 'Expert 3'].map(expertCol => {
                          const expertNote = getExpertNoteForLine(rowData.col2, expertCol);
                          const noteContent = expertNote ? getExpertNoteContent(expertNote, expertCol) : null;
                          
                          // Show more text when LLM columns are hidden
                          const maxLength = showLLM ? 20 : 50;
                          
                          return (
                            <td key={expertCol} className="px-4 py-2 border border-gray-300 text-sm">
                              {noteContent?.abstract ? (
                                <div
                                  className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full cursor-pointer"
                                  title={noteContent.fullContent}
                                >
                                  {noteContent.abstract.length > maxLength ? noteContent.abstract.substring(0, maxLength) + '...' : noteContent.abstract}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          );
                        })}
                      </>
                    )}
                    
                    {/* LLM Notes columns */}
                    {showLLM && (
                      <>
                        {[{col: 'Claude', displayName: 'LLM1 (Claude)'}, {col: 'ChatGPT', displayName: 'LLM2 (ChatGPT)'}].map(llm => {
                          const llmNote = getLLMNoteForLine(rowData.col2, llm.col);
                          const noteContent = llmNote ? getLLMNoteContent(llmNote, llm.col) : null;
                          
                          // Show more text when Expert columns are hidden
                          const maxLength = showExperts ? 20 : 60;
                          
                          return (
                            <td key={llm.col} className="px-4 py-2 border border-gray-300 text-sm">
                              {noteContent?.abstract ? (
                                <div
                                  className="inline-block bg-pink-100 text-pink-800 text-xs px-2 py-1 rounded-full cursor-pointer"
                                  title={noteContent.fullContent}
                                >
                                  {noteContent.abstract.length > maxLength ? noteContent.abstract.substring(0, maxLength) + '...' : noteContent.abstract}
                                </div>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                          );
                        })}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Floating Windows */}
      {floatingWindows.map(window => (
        <FloatingWindow
          key={window.id}
          window={window}
          onClose={closeWindow}
          onMinimize={toggleMinimize}
          onExpand={toggleExpand}
          onBringToFront={bringToFront}
          onUpdatePosition={updateWindowPosition}
        />
      ))}
    </div>
  );
} 