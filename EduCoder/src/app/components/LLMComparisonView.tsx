"use client";

import React, { useState } from 'react';
import { AnnotationData } from './AnnotationPanel';

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

interface FeatureStat {
  agreementRate: string;
  precision: string;
  recall: string;
  f1: string;
  totalComparisons: number;
  agreements: number;
  humanYes: number;
  llmYes: number;
  bothYes: number;
}

interface LLMComparisonViewProps {
  number: string;
  tableData: TableRow[];
  humanAnnotations: AnnotationData | null;
  llmAnnotations: AnnotationData | null;
  onBack: () => void;
  speakerColors: { [key: string]: string };
  whichSegment: string;
  hasSelectableColumn: boolean;
}

export default function LLMComparisonView({
  number,
  tableData,
  humanAnnotations,
  llmAnnotations,
  onBack,
  speakerColors,
  whichSegment,
  hasSelectableColumn
}: LLMComparisonViewProps) {
  const [selectedFeature, setSelectedFeature] = useState<string | null>('Conceptual');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isStatsCollapsed, setIsStatsCollapsed] = useState<boolean>(true);
  const [currentSearchIndex, setCurrentSearchIndex] = useState<number>(0);
  const [definitionPopup, setDefinitionPopup] = useState<{code: string, definition: string} | null>(null);
  const [showAllRows, setShowAllRows] = useState<boolean>(false);
  const [showAnnotationWindow, setShowAnnotationWindow] = useState<string | null>(null);
  const [showAllFeaturesWindow, setShowAllFeaturesWindow] = useState<number | null>(null);
  const [selectedDefinition, setSelectedDefinition] = useState<{
    code: string;
    definition: string;
    example1: string;
    example2: string;
    nonexample1: string;
    nonexample2: string;
  } | null>(null);

  // Helper function to get feature value for any code in a feature
  const getFeatureValue = (data: AnnotationData | null, feature: string, lineNumber: number): boolean => {
    if (!data || !data[feature]) return false;
    const featureData = data[feature];
    
    // Convert line number to row index (assuming line numbers start from 1, row indices from 0)
    const rowIndex = lineNumber - 1;
    
    if (!featureData.annotations || !featureData.annotations[rowIndex]) return false;
    
    // Check if any code in this row is true
    const annotations = featureData.annotations[rowIndex];
    return Object.values(annotations).some(value => value === true);
  };

  // Helper function to get specific code value
  const getCodeValue = (data: AnnotationData | null, feature: string, code: string, lineNumber: number): boolean => {
    if (!data || !data[feature]) return false;
    const featureData = data[feature];
    
    // Convert line number to row index (assuming line numbers start from 1, row indices from 0)
    const rowIndex = lineNumber - 1;
    
    if (!featureData.annotations || !featureData.annotations[rowIndex]) return false;
    
    return featureData.annotations[rowIndex][code] || false;
  };

  // Get all codes for a specific feature
  const getFeatureCodes = (data: AnnotationData | null, feature: string): string[] => {
    if (!data || !data[feature]) return [];
    return data[feature].codes || [];
  };

  // Get feature definition for a specific code
  const getCodeDefinition = (data: AnnotationData | null, feature: string, code: string): string => {
    if (!data || !data[feature] || !data[feature].definitions) return '';
    return data[feature].definitions[code]?.Definition || '';
  };

  // Get full feature definition with examples
  const getFullCodeDefinition = (data: AnnotationData | null, feature: string, code: string) => {
    if (!data || !data[feature] || !data[feature].definitions) return null;
    const def = data[feature].definitions[code];
    if (!def) return null;
    
    return {
      code,
      definition: def.Definition || '',
      example1: def.example1 || '',
      example2: def.example2 || '',
      nonexample1: def.nonexample1 || '',
      nonexample2: def.nonexample2 || ''
    };
  };

  // Handle feature click to show definition
  const handleFeatureClick = (code: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    const fullDef = getFullCodeDefinition(llmAnnotations, selectedFeature!, code);
    if (fullDef) {
      setSelectedDefinition(fullDef);
    }
  };

  // Handle opening all features window for a specific line
  const handleOpenAllFeaturesWindow = (lineNumber: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setShowAllFeaturesWindow(lineNumber);
  };

  const handleCloseAnnotationWindow = () => {
    setShowAnnotationWindow(null);
  };

  const handleCloseAllFeaturesWindow = () => {
    setShowAllFeaturesWindow(null);
  };

  const handleCloseDefinition = () => {
    setSelectedDefinition(null);
  };

  // Get all annotation data for a specific line across all categories
  const getAllAnnotationsForLine = (lineNumber: number) => {
    const lineIndex = lineNumber - 1;
    const allCategories = getAvailableFeatures();
    const annotations: { [category: string]: { [code: string]: boolean | number } } = {};
    
    allCategories.forEach(category => {
      if (llmAnnotations?.[category]) {
        const codes = llmAnnotations[category].codes || [];
        const lineAnnotations = llmAnnotations[category].annotations[lineIndex] || {};
        
        annotations[category] = {};
        codes.forEach(code => {
          annotations[category][code] = lineAnnotations[code] || false;
        });
      }
    });
    
    return annotations;
  };

  // Click outside to close dropdowns
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-dropdown="true"]') && !target.closest('[data-cell-key]')) {
        // No dropdowns to close in current implementation
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  // Check if a table row is selectable (same logic as main transcript)
  const isTableRowSelectable = (rowData: TableRow): boolean => {
    // If no "Selectable" column exists in the data, all rows are annotatable
    if (!hasSelectableColumn) {
      return true;
    }
    
    // If "Selectable" column exists, check the value
    if (!rowData.col7 || rowData.col7.trim() === '') {
      return false; // Empty values in selectable column mean not selectable
    }
    
    const selectableValue = rowData.col7.toLowerCase().trim();
    return selectableValue === "true" || selectableValue === "yes" || selectableValue === "1";
  };

  // Calculate statistics for a feature
  const calculateFeatureStats = (feature: string): FeatureStat => {
    // For Lexical features, return "-" for agreement rate
    if (feature === 'Lexical') {
            return {
        agreementRate: '-',
        precision: '0.0',
        recall: '0.0',
        f1: '0.0',
        totalComparisons: 0,
        agreements: 0,
        humanYes: 0,
        llmYes: 0,
        bothYes: 0
      };
    }

    let totalComparisons = 0;
    let agreements = 0;
    let humanYes = 0;
    let llmYes = 0;
    let bothYes = 0;

    // Get all unique line numbers from tableData
    const lineNumbers = tableData.map(row => row.col2);

    lineNumbers.forEach(lineNumber => {
      const humanValue = getFeatureValue(humanAnnotations, feature, lineNumber);
      const llmValue = getFeatureValue(llmAnnotations, feature, lineNumber);
      
      totalComparisons++;
      
      if (humanValue === llmValue) {
        agreements++;
      }
      
      if (humanValue) humanYes++;
      if (llmValue) llmYes++;
      if (humanValue && llmValue) bothYes++;
    });

    const agreementRate = totalComparisons > 0 ? ((agreements / totalComparisons) * 100).toFixed(1) : '0.0';
    const precision = llmYes > 0 ? ((bothYes / llmYes) * 100).toFixed(1) : '0.0';
    const recall = humanYes > 0 ? ((bothYes / humanYes) * 100).toFixed(1) : '0.0';
    const precisionNum = llmYes > 0 ? (bothYes / llmYes) : 0;
    const recallNum = humanYes > 0 ? (bothYes / humanYes) : 0;
    const f1 = (precisionNum + recallNum) > 0 ? ((2 * precisionNum * recallNum) / (precisionNum + recallNum) * 100).toFixed(1) : '0.0';

    return {
      agreementRate,
      precision,
      recall,
      f1,
      totalComparisons,
      agreements,
      humanYes,
      llmYes,
      bothYes
    };
  };

  // Calculate statistics for a specific code within a feature
  const calculateCodeStats = (feature: string, code: string): FeatureStat => {
    let totalComparisons = 0;
    let agreements = 0;
    let humanYes = 0;
    let llmYes = 0;
    let bothYes = 0;

    // Get all unique line numbers from displayTableData
    const lineNumbers = displayTableData.map(row => row.col2);

    lineNumbers.forEach(lineNumber => {
      const humanValue = getCodeValue(humanAnnotations, feature, code, lineNumber);
      const llmValue = getCodeValue(llmAnnotations, feature, code, lineNumber);
      
      totalComparisons++;
      
      if (humanValue === llmValue) {
        agreements++;
      }
      
      if (humanValue) humanYes++;
      if (llmValue) llmYes++;
      if (humanValue && llmValue) bothYes++;
    });

    const agreementRate = totalComparisons > 0 ? ((agreements / totalComparisons) * 100).toFixed(1) : '0.0';
    const precision = llmYes > 0 ? ((bothYes / llmYes) * 100).toFixed(1) : '0.0';
    const recall = humanYes > 0 ? ((bothYes / humanYes) * 100).toFixed(1) : '0.0';
    const precisionNum = llmYes > 0 ? (bothYes / llmYes) : 0;
    const recallNum = humanYes > 0 ? (bothYes / humanYes) : 0;
    const f1 = (precisionNum + recallNum) > 0 ? ((2 * precisionNum * recallNum) / (precisionNum + recallNum) * 100).toFixed(1) : '0.0';

    return {
      agreementRate,
      precision,
      recall,
      f1,
      totalComparisons,
      agreements,
      humanYes,
      llmYes,
      bothYes
    };
  };

  // Get available features
  const getAvailableFeatures = (): string[] => {
    const features = new Set<string>();
    
    if (humanAnnotations) {
      Object.keys(humanAnnotations).forEach(key => {
        if (key !== 'Talk') {
          features.add(key);
        }
      });
    }
    
    if (llmAnnotations) {
      Object.keys(llmAnnotations).forEach(key => {
        if (key !== 'Talk') {
          features.add(key);
        }
      });
    }
    
    return Array.from(features).sort();
  };



  // Helper function to get Talk data for visualization
  const getTalkData = (): Record<string, unknown>[] | null => {
    if (!llmAnnotations || !llmAnnotations['Talk']) return null;
    
    const talkData = llmAnnotations['Talk'];
    const annotations = talkData.annotations;
    
    // Convert annotations object to array for easier processing
    const rawData = Object.keys(annotations).map(key => ({
      index: parseInt(key),
      ...annotations[parseInt(key)]
    })) as Record<string, unknown>[];
    
    // Sort by segment first, then by speaker
    return rawData.sort((a, b) => {
      // First sort by segment
      const segmentA = String(a.Segment || '');
      const segmentB = String(b.Segment || '');
      if (segmentA !== segmentB) {
        return segmentA.localeCompare(segmentB);
      }
      
      // Then sort by speaker within the same segment
      const speakerA = String(a.Speaker || '');
      const speakerB = String(b.Speaker || '');
      
      // Extract student numbers for proper numeric sorting
      const getStudentNumber = (speaker: string) => {
        const match = speaker.match(/Student\s*(\d+)/i);
        return match ? parseInt(match[1]) : 999; // Put non-student speakers at the end
      };
      
      const studentNumA = getStudentNumber(speakerA);
      const studentNumB = getStudentNumber(speakerB);
      
      if (studentNumA !== studentNumB) {
        return studentNumA - studentNumB;
      }
      
      // Fallback to alphabetical sorting for non-student speakers or same student numbers
      return speakerA.localeCompare(speakerB);
    });
  };

  // Check if Talk data is available
  const hasTalkData = llmAnnotations && llmAnnotations['Talk'];

  // Filter table data based on segment only (for base data)
  const baseTableData = tableData.filter(rowData => {
    if (whichSegment === 'student_only') {
      return rowData.col5.includes('Student');
    } else {
      return whichSegment === 'full_transcript' || rowData.col1 === whichSegment;
    }
  });

  // Get search results (subset of base data)
  const searchResults = searchTerm.trim() ? baseTableData.filter(rowData => {
    const searchLower = searchTerm.toLowerCase().trim();
    const isLineNumber = /^\d+$/.test(searchLower);
    
    if (isLineNumber) {
      // Search by line number
      return rowData.col2.toString() === searchLower;
    } else {
      // Search by utterance content
      return rowData.col6.toLowerCase().includes(searchLower);
    }
  }) : [];

  // Filter out rows that are entirely unannotable (all "-") unless showAllRows is true
  const displayTableData = showAllRows ? baseTableData : baseTableData.filter(row => isTableRowSelectable(row));

  const availableFeatures = getAvailableFeatures();

  // Reset search index when search term changes
  React.useEffect(() => {
    setCurrentSearchIndex(0);
  }, [searchTerm]);

  // Navigation functions for search results
  const navigateSearchResults = (direction: 'next' | 'prev') => {
    if (searchResults.length === 0) return;
    
    if (direction === 'next') {
      setCurrentSearchIndex((prev) => (prev + 1) % searchResults.length);
    } else {
      setCurrentSearchIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    }
  };

  const renderFeatureComparison = () => (
    <div className="space-y-6">
      {/* Feature Selection - Compact */}
      <div className="bg-white p-3 rounded-lg border">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {availableFeatures.map(feature => {
            const stats = calculateFeatureStats(feature);
  return (
            <button
                key={feature}
                onClick={() => setSelectedFeature(selectedFeature === feature ? null : feature)}
                className={`p-2 rounded-lg border-2 transition-all text-left ${
                  selectedFeature === feature
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="font-medium text-sm mb-1 text-black">{feature}</div>
                {/* Mini progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                  <div 
                    className="bg-green-500 h-1.5 rounded-full transition-all duration-300" 
                    style={{ width: `${stats.agreementRate}%` }}
                  ></div>
          </div>
                <div className="text-xs text-black">
                  {stats.agreementRate}%
                </div>
              </button>
            );
          })}
          
          {/* Talk Feature Button */}
          {hasTalkData && (
              <button
              onClick={() => setSelectedFeature(selectedFeature === 'Talk' ? null : 'Talk')}
              className={`p-2 rounded-lg border-2 transition-all text-left ${
                selectedFeature === 'Talk'
                  ? 'border-purple-400 bg-purple-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <div className="font-medium text-sm mb-1 text-black">Talk</div>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-1">
                <div className="bg-purple-500 h-1.5 rounded-full w-full"></div>
              </div>
              <div className="text-xs text-black">
                Aggregate
              </div>
              </button>
          )}
        </div>
      </div>

      {/* Statistics Panel */}
      <div className="bg-white rounded-lg border">
        <div 
          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b"
          onClick={() => setIsStatsCollapsed(!isStatsCollapsed)}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              📊 Aggregate Statistics
            </h3>
            <div className="flex items-center gap-2">
              {selectedFeature && (
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {selectedFeature}
                </span>
              )}
              <span className={`transform transition-transform ${isStatsCollapsed ? 'rotate-180' : ''}`}>
                ▲
            </span>
            </div>
          </div>
          </div>

        {!isStatsCollapsed && (
          <div className="p-6">
            {selectedFeature && selectedFeature !== 'Lexical' && selectedFeature !== 'Talk' ? (
              (() => {
                const stats = calculateFeatureStats(selectedFeature);
                return (
                  <div className="space-y-4">
                    {/* Selected Feature Stats */}
                    <div className="bg-green-50 p-6 rounded-lg border-l-4 border-green-400">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-green-800 font-semibold text-lg">&quot;{selectedFeature}&quot; Agreement Rate</div>
                        <div className="text-3xl font-bold text-green-900">{stats.agreementRate}%</div>
                      </div>
                      {/* Visual progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                        <div 
                          className="bg-green-600 h-3 rounded-full transition-all duration-500" 
                          style={{ width: `${stats.agreementRate}%` }}
                        ></div>
                      </div>
                      <div className="text-sm text-green-700">
                        {stats.agreements} out of {stats.totalComparisons} annotations match
                      </div>
                    </div>
                    
                    {/* Per-Code Agreement Stats for Detailed Features */}
                    {(selectedFeature === 'Conceptual' || selectedFeature === 'Discursive') && (
                      <div className="border-t pt-4">
                        <h4 className="font-semibold text-gray-700 mb-3">Per-Code Agreement Rates:</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(() => {
                            const humanCodes = getFeatureCodes(humanAnnotations, selectedFeature);
                            const llmCodes = getFeatureCodes(llmAnnotations, selectedFeature);
                            const allCodes = Array.from(new Set([...humanCodes, ...llmCodes])).sort();
                            
                            return allCodes.map(code => {
                              const codeStats = calculateCodeStats(selectedFeature, code);
                              return (
                                <div key={code} className="bg-gray-50 p-3 rounded border">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700">{code}</span>
                                    <span className="text-sm font-bold text-gray-900">{codeStats.agreementRate}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div 
                                      className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                                      style={{ width: `${codeStats.agreementRate}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()
            ) : selectedFeature === 'Lexical' ? (
              <div className="text-center text-gray-500 py-4">
                No aggregate statistics available for {selectedFeature} features
              </div>
            ) : selectedFeature === 'Talk' ? (
              (() => {
                const talkData = getTalkData();
                if (!talkData) {
                  return (
                    <div className="text-center text-gray-500 py-4">
                      No Talk data available
                    </div>
                  );
                }



                return (
                  <div className="space-y-6">
                    {/* Charts moved from Discourse Analysis Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Turn Count by Speaker */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Turn Count by Speaker</h3>
                        <div className="space-y-3">
                          {(() => {
                            // Extract unique speakers for visualization
                            const uniqueSpeakers = Array.from(new Set(talkData.map(row => String(row.Speaker || '')).filter(Boolean))).sort();
                            
                            return uniqueSpeakers.map(speaker => {
                              const speakerData = talkData.filter(row => row.Speaker === speaker);
                              const totalTurns = speakerData.reduce((sum, row) => sum + (parseInt(String(row['Turn Count'] || '0'))), 0);
                              const maxTurns = Math.max(...uniqueSpeakers.map(s => 
                                talkData.filter(row => row.Speaker === s).reduce((sum, row) => sum + (parseInt(String(row['Turn Count'] || '0'))), 0)
                              ));
                              const percentage = maxTurns > 0 ? (totalTurns / maxTurns) * 100 : 0;
                              
                              return (
                                <div key={speaker} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-medium text-black">{speaker}</span>
                                    <span className="text-black">{totalTurns}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                      className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Ontask % by Speaker */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Avg Ontask % by Speaker</h3>
                        <div className="space-y-3">
                          {(() => {
                            // Extract unique speakers for visualization
                            const uniqueSpeakers = Array.from(new Set(talkData.map(row => String(row.Speaker || '')).filter(Boolean))).sort();
                            
                            return uniqueSpeakers.map(speaker => {
                              const speakerData = talkData.filter(row => row.Speaker === speaker);
                              const avgOntask = speakerData.length > 0 ? 
                                speakerData.reduce((sum, row) => sum + (parseFloat(String(row['Ontask %'] || '0'))), 0) / speakerData.length : 0;
                              const maxOntask = Math.max(...uniqueSpeakers.map(s => {
                                const data = talkData.filter(row => row.Speaker === s);
                                return data.length > 0 ? data.reduce((sum, row) => sum + (parseFloat(String(row['Ontask %'] || '0'))), 0) / data.length : 0;
                              }));
                              const percentage = maxOntask > 0 ? (avgOntask / maxOntask) * 100 : 0;
                              
                              return (
                                <div key={speaker} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-medium text-black">{speaker}</span>
                                    <span className="text-black">{avgOntask.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="text-center text-gray-500 py-4">
                Select a feature to view detailed statistics
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Bar */}
      {selectedFeature && (
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Search:</label>
                <input
                  type="text"
                  value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter line number or search utterance..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {searchTerm && searchResults.length > 1 && (
              <div className="flex items-center gap-2">
                    <button
                  onClick={() => navigateSearchResults('prev')}
                  className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  title="Previous result"
                    >
                      ↑
                    </button>
                <span className="text-sm text-gray-600">
                  {currentSearchIndex + 1} / {searchResults.length}
                </span>
                    <button
                  onClick={() => navigateSearchResults('next')}
                  className="px-2 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                  title="Next result"
                    >
                      ↓
                    </button>
              </div>
                )}
                {searchTerm && (
                  <button
                onClick={() => setSearchTerm('')}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                Clear
                  </button>
                )}
                
                {/* Toggle to show all rows */}
                <button
                  onClick={() => setShowAllRows(!showAllRows)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                    showAllRows
                      ? 'bg-blue-100 text-blue-800 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  title={showAllRows ? 'Currently showing all rows' : 'Currently showing only annotatable rows'}
                >
                  <span className="text-xs">{showAllRows ? '👁️' : '🔍'}</span>
                  {showAllRows ? 'Show All' : 'Annotated Only'}
                </button>
              </div>
          <div className="text-xs text-gray-500 mt-2">
            Tip: Enter a number to search by line, or text to search utterances. Use the toggle to show all rows or only annotatable ones. {searchTerm ? `Found ${searchResults.length} result${searchResults.length !== 1 ? 's' : ''}.` : `Showing ${displayTableData.length} ${showAllRows ? 'total' : 'annotatable'} rows.`}
            <br />
            <span className="text-blue-600 font-medium">💡 Click on any line number, speaker, or utterance to see all LLM annotations for that line.</span>
            </div>
            </div>
      )}

      {/* Comparison table - Made larger with max-h-[600px] */}
      {selectedFeature && (
        <div className="bg-white rounded-lg border w-full">
          <div className="overflow-auto max-h-[70vh] border border-gray-300 rounded-lg w-full">

           
            {/* Show detailed code comparison for Conceptual and Discursive */}
            {(selectedFeature === 'Conceptual' || selectedFeature === 'Discursive') ? (
              (() => {
                const humanCodes = getFeatureCodes(humanAnnotations, selectedFeature);
                const llmCodes = getFeatureCodes(llmAnnotations, selectedFeature);
                // Remove duplicates and normalize case (prefer capitalized version)
                const allCodesSet = new Set([...humanCodes, ...llmCodes]);
                const normalizedCodes = Array.from(allCodesSet).reduce((acc, code) => {
                  const lowerCode = code.toLowerCase();
                  const existingCode = acc.find(c => c.toLowerCase() === lowerCode);
                  if (!existingCode) {
                    acc.push(code);
                  } else if (code[0] === code[0].toUpperCase() && existingCode[0] === existingCode[0].toLowerCase()) {
                    // Replace lowercase with uppercase version
                    const index = acc.indexOf(existingCode);
                    acc[index] = code;
                  }
                  return acc;
                }, [] as string[]);
                const allCodes = normalizedCodes.sort();

                return (
                  <table className="w-full text-sm border-collapse shadow-lg">
                    <thead className="sticky top-0 z-30">
                      {/* Single header row */}
                      <tr className="bg-gradient-to-r from-gray-700 to-gray-600 text-white">
                        <th className="p-3 border-2 border-gray-500 text-left font-semibold sticky left-0 bg-gray-700 z-40 border-r-2 border-r-gray-400 shadow-md">Line #</th>
                        <th className="p-3 border-2 border-gray-500 text-left font-semibold sticky left-16 bg-gray-700 z-40 border-r-2 border-r-gray-400 shadow-md">Speaker</th>
                        <th className="p-3 border-2 border-gray-500 text-left font-semibold sticky left-32 bg-gray-700 z-40 min-w-80 border-r-2 border-r-gray-400 shadow-md">Utterance</th>
                        {allCodes.map(code => {
                          const definition = getCodeDefinition(humanAnnotations, selectedFeature, code) || 
                                           getCodeDefinition(llmAnnotations, selectedFeature, code);
                          
                          // Use original case for all headers
                          const displayCode = code;
                          
                          return (
                            <th key={code} className="p-1 border border-gray-500 text-center font-semibold min-w-24 bg-gradient-to-b from-gray-700 to-gray-600">
                              <div className="text-xs font-semibold mb-1 text-white">
                                {definition ? (
                                  <a
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setDefinitionPopup({code, definition});
                                    }}
                                    className="text-blue-200 hover:text-blue-100 underline cursor-pointer transition-colors"
                                    title={`Click to see definition: ${definition}`}
                                  >
                                    {displayCode}
                                  </a>
                                ) : (
                                  <span className="text-white">{displayCode}</span>
                                )}
                    </div>
                              <div className="flex flex-col gap-1">
                                <div className="text-xs bg-blue-600 text-white px-1 py-0.5 rounded font-medium">You</div>
                                <div className="text-xs bg-green-600 text-white px-1 py-0.5 rounded font-medium">LLM</div>
                </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {displayTableData.map((row, index) => {
                        // Use the same speaker colors as main transcript page
                        let rowBgColor = speakerColors[row.col5] || 'bg-gray-100';
                        
                        // Highlight current search result
                        const isCurrentSearchResult = searchTerm.trim() && 
                          searchResults.length > 0 && 
                          currentSearchIndex < searchResults.length &&
                          row.col2 === searchResults[currentSearchIndex]?.col2;
                        if (isCurrentSearchResult) {
                          rowBgColor = 'bg-yellow-200 border-2 border-yellow-400';
                        }

                        return (
                          <tr key={index} className={`${rowBgColor} hover:bg-opacity-80 transition-colors`}>
                            <td className={`p-3 border border-gray-300 font-mono sticky left-0 z-10 ${rowBgColor} border-r-2 border-r-gray-400 shadow-sm font-semibold text-gray-900 cursor-pointer hover:bg-blue-50`}
                                onClick={(e) => handleOpenAllFeaturesWindow(row.col2, e)}
                                title="Click to see all LLM annotations for this line">
                              {row.col2}
                            </td>
                            <td className={`p-3 border border-gray-300 sticky left-16 z-10 ${rowBgColor} border-r-2 border-r-gray-400 shadow-sm font-medium text-gray-900 cursor-pointer hover:bg-blue-50`}
                                onClick={(e) => handleOpenAllFeaturesWindow(row.col2, e)}
                                title="Click to see all LLM annotations for this line">
                              {row.col5}
                            </td>
                            <td className={`p-3 border border-gray-300 sticky left-32 z-10 ${rowBgColor} border-r-2 border-r-gray-400 shadow-sm text-gray-900 cursor-pointer hover:bg-blue-50`} 
                                onClick={(e) => handleOpenAllFeaturesWindow(row.col2, e)}
                                title={`Click to see all LLM annotations for this line: ${row.col6}`}>
                              {row.col6}
                            </td>
                            {allCodes.map(code => {
                              const humanValue = getCodeValue(humanAnnotations, selectedFeature, code, row.col2);
                              const llmValue = getCodeValue(llmAnnotations, selectedFeature, code, row.col2);
                              const isMatch = humanValue === llmValue;
                              const isRowAnnotatable = isTableRowSelectable(row);
                              
                              return (
                                <td key={code} className={`p-1 border text-center text-xs font-medium transition-colors ${
                                  !isRowAnnotatable ? 'border-gray-300 bg-gray-50' :
                                  !isMatch ? 'border-red-400 border-2 bg-red-50' : 'border-gray-300 hover:bg-gray-50'
                                }`}>
                                  {isRowAnnotatable ? (
                                    /* Stacked layout for annotatable rows */
                                    <div className="flex flex-col gap-1">
                                      {/* Human value on top */}
                                      <div className={`px-2 py-1 rounded transition-colors ${
                                        humanValue ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600'
                                      }`}>
                                        {humanValue ? 'Yes' : 'No'}
                                      </div>
                                      {/* LLM value on bottom */}
                                      <div className={`px-2 py-1 rounded transition-colors ${
                                        llmValue ? 'bg-green-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600'
                                      }`}>
                                        {llmValue ? 'Yes' : 'No'}
                                      </div>
                                    </div>
                                  ) : (
                                    /* Non-annotatable rows show N/A */
                                    <div className="flex flex-col gap-1">
                                      <div className="px-2 py-1 rounded bg-gray-100 text-gray-400 text-xs">
                                        N/A
                                      </div>
                                      <div className="px-2 py-1 rounded bg-gray-100 text-gray-400 text-xs">
                                        N/A
                                      </div>
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })()
            ) : selectedFeature === 'Lexical' ? (
              /* Show LIWC data for Lexical features */
              (() => {
                const humanCodes = getFeatureCodes(humanAnnotations, selectedFeature);
                const llmCodes = getFeatureCodes(llmAnnotations, selectedFeature);
                const allCodes = Array.from(new Set([...humanCodes, ...llmCodes])).sort();

                return (
                  <div className="space-y-4">
                    
                    <table className="w-full text-sm border-collapse shadow-lg">
                      <thead className="sticky top-0 z-30">
                        <tr className="bg-gradient-to-r from-gray-700 to-gray-600 text-white">
                          <th className="p-3 border-2 border-gray-500 text-left font-semibold sticky left-0 bg-gray-700 z-40 border-r-2 border-r-gray-400 shadow-md">Line #</th>
                          <th className="p-3 border-2 border-gray-500 text-left font-semibold sticky left-16 bg-gray-700 z-40 border-r-2 border-r-gray-400 shadow-md">Speaker</th>
                          <th className="p-3 border-2 border-gray-500 text-left font-semibold sticky left-32 bg-gray-700 z-40 min-w-80 border-r-2 border-r-gray-400 shadow-md">Utterance</th>
                                                     {allCodes.map(code => (
                             <th key={code} className="p-3 border border-gray-500 text-center font-semibold min-w-24 bg-gradient-to-b from-gray-700 to-gray-600">
                               <div className="text-xs font-semibold text-white">📊 {code}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
                        {displayTableData.map((row, index) => {
                          // Use the same speaker colors as main transcript page
                          let rowBgColor = speakerColors[row.col5] || 'bg-gray-100';
                          
                          const isCurrentSearchResult = searchTerm.trim() && 
                            searchResults.length > 0 && 
                            currentSearchIndex < searchResults.length &&
                            row.col2 === searchResults[currentSearchIndex]?.col2;
                          if (isCurrentSearchResult) {
                            rowBgColor = 'bg-yellow-200 border-2 border-yellow-400';
                          }

                return (
                            <tr key={index} className={`${rowBgColor} hover:bg-opacity-80 transition-colors`}>
                              <td className={`p-3 border border-gray-300 font-mono sticky left-0 z-10 ${rowBgColor} border-r-2 border-r-gray-400 shadow-sm font-semibold text-gray-900 cursor-pointer hover:bg-blue-50`}
                                  onClick={(e) => handleOpenAllFeaturesWindow(row.col2, e)}
                                  title="Click to see all LLM annotations for this line">
                                {row.col2}
                    </td>
                              <td className={`p-3 border border-gray-300 sticky left-16 z-10 ${rowBgColor} border-r-2 border-r-gray-400 shadow-sm font-medium text-gray-900 cursor-pointer hover:bg-blue-50`}
                                  onClick={(e) => handleOpenAllFeaturesWindow(row.col2, e)}
                                  title="Click to see all LLM annotations for this line">
                                {row.col5}
                    </td>
                              <td className={`p-3 border border-gray-300 sticky left-32 z-10 ${rowBgColor} border-r-2 border-r-gray-400 shadow-sm text-gray-900 cursor-pointer hover:bg-blue-50`} 
                                  onClick={(e) => handleOpenAllFeaturesWindow(row.col2, e)}
                                  title={`Click to see all LLM annotations for this line: ${row.col6}`}>
                                {row.col6}
                    </td>
                            {allCodes.map(code => {
                              // Get LLM value as integer
                              const llmValue = llmAnnotations?.[selectedFeature]?.annotations[row.col2 - 1]?.[code] ?? 0;
                              const intValue = typeof llmValue === 'number' ? Math.round(llmValue) : parseInt(String(llmValue)) || 0;
                              const isRowAnnotatable = isTableRowSelectable(row);
                              
                              return (
                                <td 
                                  key={code} 
                                  className={`p-3 border border-gray-300 text-center cursor-pointer hover:bg-blue-50 relative ${!isRowAnnotatable ? 'bg-gray-50' : ''}`}
                                  onClick={(e) => handleFeatureClick(code, e)}
                                  title={`Click to see definition for ${code}`}
                                  data-cell-key={`${selectedFeature}-${row.col2}-${code}`}
                                >
                                  {isRowAnnotatable ? (
                                    intValue > 0 ? (
                                      <div className="text-black font-normal text-base">
                                        {intValue}
                                      </div>
                                    ) : (
                                      <div className="h-8"></div>
                                    )
                                  ) : (
                                    <div className="text-gray-400 text-sm">N/A</div>
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
                );
              })()
            ) : selectedFeature === 'Talk' ? (
              /* Show Talk aggregate data visualizations */
              (() => {
                const talkData = getTalkData();
                if (!talkData || talkData.length === 0) {
                  return (
                    <div className="text-center py-8 text-gray-500">
                      No Talk data available
      </div>
                  );
                }

                return (
                  <div className="space-y-6">
                    {/* Charts moved from Discourse Analysis Metrics */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Turn Count by Speaker */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Turn Count by Speaker</h3>
                        <div className="space-y-3">
                          {(() => {
                            // Extract unique speakers for visualization
                            const uniqueSpeakers = Array.from(new Set(talkData.map(row => String(row.Speaker || '')).filter(Boolean))).sort();
                            
                            return uniqueSpeakers.map(speaker => {
                              const speakerData = talkData.filter(row => row.Speaker === speaker);
                              const totalTurns = speakerData.reduce((sum, row) => sum + (parseInt(String(row['Turn Count'] || '0'))), 0);
                              const maxTurns = Math.max(...uniqueSpeakers.map(s => 
                                talkData.filter(row => row.Speaker === s).reduce((sum, row) => sum + (parseInt(String(row['Turn Count'] || '0'))), 0)
                              ));
                              const percentage = maxTurns > 0 ? (totalTurns / maxTurns) * 100 : 0;
                              
                              return (
                                <div key={speaker} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-medium text-black">{speaker}</span>
                                    <span className="text-black">{totalTurns}</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                      className="bg-purple-500 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>

                      {/* Ontask % by Speaker */}
                      <div className="bg-white p-4 rounded-lg border">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Avg Ontask % by Speaker</h3>
                        <div className="space-y-3">
                          {(() => {
                            // Extract unique speakers for visualization
                            const uniqueSpeakers = Array.from(new Set(talkData.map(row => String(row.Speaker || '')).filter(Boolean))).sort();
                            
                            return uniqueSpeakers.map(speaker => {
                              const speakerData = talkData.filter(row => row.Speaker === speaker);
                              const avgOntask = speakerData.length > 0 ? 
                                speakerData.reduce((sum, row) => sum + (parseFloat(String(row['Ontask %'] || '0'))), 0) / speakerData.length : 0;
                              const maxOntask = Math.max(...uniqueSpeakers.map(s => {
                                const data = talkData.filter(row => row.Speaker === s);
                                return data.length > 0 ? data.reduce((sum, row) => sum + (parseFloat(String(row['Ontask %'] || '0'))), 0) / data.length : 0;
                              }));
                              const percentage = maxOntask > 0 ? (avgOntask / maxOntask) * 100 : 0;
                              
                              return (
                                <div key={speaker} className="space-y-1">
                                  <div className="flex justify-between text-sm">
                                    <span className="font-medium text-black">{speaker}</span>
                                    <span className="text-black">{avgOntask.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-3">
                                    <div 
                                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    ></div>
                                  </div>
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Total Turn Count */}
                      <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Turn Count</h3>
                        <div className="text-2xl font-bold text-purple-600">
                          {talkData.reduce((sum, row) => sum + (parseInt(String(row['Turn Count'] || '0')) || 0), 0)}
              </div>
              </div>

                      {/* Average Ontask % */}
                      <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">Avg Ontask %</h3>
                        <div className="text-2xl font-bold text-green-600">
                          {(talkData.reduce((sum, row) => sum + (parseFloat(String(row['Ontask %'] || '0'))), 0) / talkData.length).toFixed(1)}%
            </div>
                </div>

                      {/* Total Crosstalk */}
                      <div className="bg-white p-4 rounded-lg border shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-600 mb-2">Total Crosstalk</h3>
                        <div className="text-2xl font-bold text-orange-600">
                          {talkData.reduce((sum, row) => sum + (parseInt(String(row['Crosstalk Count'] || '0')) || 0), 0)}
              </div>
              </div>
            </div>

                    {/* Data Table */}
                    <div className="bg-white rounded-lg border overflow-hidden">
                      <div className="overflow-auto max-h-[600px]">
                        <table className="w-full text-sm border-collapse">
                                                     <thead className="sticky top-0 z-30 bg-gradient-to-r from-gray-700 to-gray-600 text-white">
                             <tr>
                               <th className="p-3 border border-gray-500 text-left font-semibold">Speaker</th>
                               <th className="p-3 border border-gray-500 text-left font-semibold">Segment</th>
                               <th className="p-3 border border-gray-500 text-center font-semibold">Turn Count</th>
                               <th className="p-3 border border-gray-500 text-center font-semibold">Duration %</th>
                               <th className="p-3 border border-gray-500 text-center font-semibold">Ontask %</th>
                               <th className="p-3 border border-gray-500 text-center font-semibold">Offtask %</th>
                               <th className="p-3 border border-gray-500 text-center font-semibold">Crosstalk Count</th>
                               <th className="p-3 border border-gray-500 text-center font-semibold">
                                 <div className="flex flex-col items-center">
                                   <span>NDG Name</span>
                                   <span className="text-xs text-gray-200 font-normal">(Name-degree social network)</span>
      </div>
                               </th>
                               <th className="p-3 border border-gray-500 text-center font-semibold">
                                 <div className="flex flex-col items-center">
                                   <span>ODG Name</span>
                                   <span className="text-xs text-gray-200 font-normal">(Out-degree social network)</span>
                                 </div>
                               </th>
                             </tr>
                           </thead>
                          <tbody>
                            {talkData.map((row, index) => {
                              const speaker = String(row.Speaker || 'Unknown');
                              const rowBgColor = speakerColors[speaker] || 'bg-gray-100';
                              
                              return (
                                                                 <tr key={index} className={`${rowBgColor} hover:bg-opacity-80 transition-colors`}>
                                   <td className="p-3 border border-gray-300 font-medium">{speaker}</td>
                                   <td className="p-3 border border-gray-300">{String(row.Segment || '-')}</td>
                                   <td className="p-3 border border-gray-300 text-center">
                                     <span className="text-black font-normal">
                                       {parseInt(String(row['Turn Count'] || '0'))}
                                     </span>
                                   </td>
                                   <td className="p-3 border border-gray-300 text-center">
                                     <span className="text-black font-normal">
                                       {parseFloat(String(row['Duration %'] || '0')).toFixed(1)}%
                                     </span>
                                   </td>
                                   <td className="p-3 border border-gray-300 text-center">
                                     <span className="text-black font-normal">
                                       {parseFloat(String(row['Ontask %'] || '0')).toFixed(1)}%
                                     </span>
                                   </td>
                                   <td className="p-3 border border-gray-300 text-center">
                                     <span className="text-black font-normal">
                                       {parseFloat(String(row['Offtask %'] || '0')).toFixed(1)}%
                                     </span>
                                   </td>
                                   <td className="p-3 border border-gray-300 text-center">
                                     <span className="text-black font-normal">
                                       {parseInt(String(row['Crosstalk Count'] || '0'))}
                                     </span>
                                   </td>
                                   <td className="p-3 border border-gray-300 text-center">
                                     <span className="text-black font-normal">
                                       {String(row['NDG_Name'] || '-')}
                                     </span>
                                   </td>
                                   <td className="p-3 border border-gray-300 text-center">
                                     <span className="text-black font-normal">
                                       {String(row['ODG_Name'] || '-')}
                                     </span>
                                   </td>
                                 </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>


                  </div>
                );
              })()
            ) : (
              /* Show simple comparison for other features */
              <table className="w-full text-sm shadow-lg border-collapse">
                <thead className="sticky top-0 z-30">
                  <tr className="bg-gradient-to-r from-gray-700 to-gray-600 text-white">
                    <th className="text-left p-3 border border-gray-500 font-semibold sticky left-0 bg-gray-700 z-40 border-r-2 border-r-gray-400 shadow-md">Line #</th>
                    <th className="text-left p-3 border border-gray-500 font-semibold sticky left-16 bg-gray-700 z-40 border-r-2 border-r-gray-400 shadow-md">Speaker</th>
                    <th className="text-left p-3 border border-gray-500 font-semibold sticky left-32 bg-gray-700 z-40 min-w-80 border-r-2 border-r-gray-400 shadow-md">Text</th>
                    <th className="text-left p-3 border border-gray-500 font-semibold">Human</th>
                    <th className="text-left p-3 border border-gray-500 font-semibold">LLM</th>
                    <th className="text-left p-3 border border-gray-500 font-semibold">Match</th>
                  </tr>
                </thead>
                                 <tbody>
                  {displayTableData.map((row, index) => {
                    const humanValue = getFeatureValue(humanAnnotations, selectedFeature, row.col2);
                    const llmValue = getFeatureValue(llmAnnotations, selectedFeature, row.col2);
                    const isMatch = humanValue === llmValue;
                    const isRowAnnotatable = isTableRowSelectable(row);
                    
                    // Use the same speaker colors as main transcript page
                    let rowBgColor = speakerColors[row.col5] || 'bg-gray-100';
                    
                    // Override with disagreement color if values don't match (only for annotatable rows)
                    if (isRowAnnotatable && !isMatch) {
                      rowBgColor = 'bg-red-50';
                    }
                    
                    // Add gray background for non-annotatable rows
                    if (!isRowAnnotatable) {
                      rowBgColor = 'bg-gray-50';
                    }
                    
                    // Highlight current search result
                    const isCurrentSearchResult = searchTerm.trim() && 
                      searchResults.length > 0 && 
                      currentSearchIndex < searchResults.length &&
                      row.col2 === searchResults[currentSearchIndex]?.col2;
                    let rowClass = rowBgColor;
                    if (isCurrentSearchResult) {
                      rowClass = 'bg-yellow-200 border-2 border-yellow-400';
                    }
                    
                    return (
                      <tr key={index} className={`${rowClass} hover:bg-opacity-80 transition-colors`}>
                        <td className={`p-3 border border-gray-300 font-mono font-semibold sticky left-0 z-10 ${rowClass} border-r-2 border-r-gray-400 shadow-sm text-gray-900 cursor-pointer hover:bg-blue-50`}
                            onClick={(e) => handleOpenAllFeaturesWindow(row.col2, e)}
                            title="Click to see all LLM annotations for this line">{row.col2}</td>
                        <td className={`p-3 border border-gray-300 sticky left-16 z-10 ${rowClass} border-r-2 border-r-gray-400 shadow-sm cursor-pointer hover:bg-blue-50`}
                            onClick={(e) => handleOpenAllFeaturesWindow(row.col2, e)}
                            title="Click to see all LLM annotations for this line">
                          <span 
                            className="px-2 py-1 rounded text-xs font-medium"
          style={{
                              backgroundColor: speakerColors[row.col5]?.replace('text-', 'bg-').replace('-600', '-100') || '#f3f4f6',
                              color: speakerColors[row.col5] || '#374151'
                            }}
                          >
                            {row.col5}
                          </span>
                        </td>
                        <td className={`p-3 border border-gray-300 max-w-xs truncate sticky left-32 z-10 ${rowClass} border-r-2 border-r-gray-400 shadow-sm text-gray-900 cursor-pointer hover:bg-blue-50`} 
                            onClick={(e) => handleOpenAllFeaturesWindow(row.col2, e)}
                            title={`Click to see all LLM annotations for this line: ${row.col6}`}>{row.col6}</td>
                        <td className="p-3 border border-gray-300">
                          {isRowAnnotatable ? (
                            <span className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              humanValue ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {humanValue ? 'Yes' : 'No'}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-400">
                              N/A
                            </span>
                          )}
                        </td>
                        <td className="p-3 border border-gray-300">
                          {isRowAnnotatable ? (
                            <span className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                              llmValue ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                            }`}>
                              {llmValue ? 'Yes' : 'No'}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-400">
                              N/A
                            </span>
                          )}
                        </td>
                        <td className="p-3 border border-gray-300 text-center">
                          {isRowAnnotatable ? (
                            <span className={`text-lg ${isMatch ? 'text-green-600' : 'text-red-600'}`}>
                              {isMatch ? '✓' : '✗'}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
                </div>
              )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      <div className="w-full">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Human vs LLM Comparison</h1>
            <p className="text-gray-600 mt-1">
              Transcript #{number} • {whichSegment === 'full_transcript' ? 'Full Transcript' : whichSegment}
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            ← Back to Transcript
          </button>
        </div>

        {/* Main Content */}
        <div className="space-y-6">
          {renderFeatureComparison()}
        </div>
      </div>

      {/* Annotation Window */}
      {showAnnotationWindow && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50"
          onClick={handleCloseAnnotationWindow}
        >
          <div 
            className="bg-white border-2 border-gray-800 rounded-lg shadow-lg p-4 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="text-lg font-semibold text-gray-800">
                {selectedFeature} Features - {showAnnotationWindow.split('-')[1] ? `Line ${showAnnotationWindow.split('-')[1]}` : ''}
              </div>
              <button
                onClick={handleCloseAnnotationWindow}
                className="text-gray-500 hover:text-gray-700 text-xl leading-none"
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {selectedFeature && llmAnnotations?.[selectedFeature]?.codes?.map((code: string) => {
                const lineNumber = parseInt(showAnnotationWindow!.split('-')[1]);
                const llmValue = llmAnnotations?.[selectedFeature]?.annotations[lineNumber - 1]?.[code] ?? 0;
                const intValue = typeof llmValue === 'number' ? Math.round(llmValue) : parseInt(String(llmValue)) || 0;
                
                return (
                  <div key={code} className="flex items-center justify-between">
                    <button
                      className="text-sky-600 hover:text-sky-800 hover:underline text-left mr-3 flex-1 text-sm"
                      onClick={(e) => handleFeatureClick(code, e)}
                      title="Click for definition and examples"
                    >
                      {code}
                    </button>
                    <div className="text-sm text-gray-600">
                      {intValue > 0 ? intValue : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* All Features Window - Shows all features for a specific line */}
      {showAllFeaturesWindow && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50"
          onClick={handleCloseAllFeaturesWindow}
        >
          <div 
            className="bg-white border-2 border-gray-800 rounded-lg shadow-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <div className="text-xl font-bold text-gray-800">
                All LLM Annotations - Line {showAllFeaturesWindow}
              </div>
              <button
                onClick={handleCloseAllFeaturesWindow}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                title="Close"
              >
                ×
              </button>
            </div>
            
            {/* Show the utterance for context */}
            {(() => {
              const rowData = tableData.find(row => row.col2 === showAllFeaturesWindow);
              if (rowData) {
                return (
                  <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">
                      <span className="font-semibold">Speaker:</span> {rowData.col5}
                    </div>
                    <div className="text-sm text-gray-800">
                      <span className="font-semibold">Utterance:</span> {rowData.col6}
                    </div>
                  </div>
                );
              }
              return null;
            })()}
            
            <div className="space-y-6">
              {(() => {
                const annotations = getAllAnnotationsForLine(showAllFeaturesWindow);
                const categories = Object.keys(annotations);
                
                if (categories.length === 0) {
                  return (
                    <div className="text-center text-gray-500 py-8">
                      No LLM annotations found for this line.
                    </div>
                  );
                }
                
                return categories.map(category => (
                  <div key={category} className="border rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {Object.entries(annotations[category]).map(([code, value]) => {
                        const isActive = typeof value === 'boolean' ? value : (typeof value === 'number' ? value > 0 : false);
                        const displayValue = typeof value === 'number' ? value : (value ? 'Yes' : 'No');
                        
                        return (
                          <div 
                            key={code} 
                            className={`p-3 rounded-lg border transition-colors ${
                              isActive 
                                ? 'bg-green-50 border-green-200 text-green-800' 
                                : 'bg-gray-50 border-gray-200 text-gray-600'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <button
                                className="text-left font-medium hover:underline"
                                onClick={(e) => {
                                  const fullDef = getFullCodeDefinition(llmAnnotations, category, code);
                                  if (fullDef) {
                                    setSelectedDefinition(fullDef);
                                  }
                                  e.stopPropagation();
                                }}
                                title="Click to see definition"
                              >
                                {code}
                              </button>
                              <span className={`text-sm font-bold ${
                                isActive ? 'text-green-700' : 'text-gray-500'
                              }`}>
                                {displayValue}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Definition Popup */}
      {selectedDefinition && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50"
          onClick={handleCloseDefinition}
        >
          <div 
            className="bg-blue-50 border-2 border-blue-300 rounded-lg shadow-lg p-4 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-3">
              <div className="text-lg font-semibold text-blue-800">
                {selectedDefinition.code}
              </div>
              <button
                onClick={handleCloseDefinition}
                className="text-blue-500 hover:text-blue-700 text-xl leading-none"
                title="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <div className="bg-white p-3 rounded-lg border border-blue-200">
                <div className="font-medium text-blue-900 mb-2">Definition:</div>
                <div className="text-gray-700">{selectedDefinition.definition}</div>
              </div>
              
              {selectedDefinition.example1 && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="font-medium text-green-800 mb-2">Example:</div>
                  <div className="text-green-700 italic">{selectedDefinition.example1}</div>
                </div>
              )}
              
              {selectedDefinition.example2 && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <div className="font-medium text-green-800 mb-2">Example 2:</div>
                  <div className="text-green-700 italic">{selectedDefinition.example2}</div>
                </div>
              )}
              
              {selectedDefinition.nonexample1 && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="font-medium text-red-800 mb-2">Non-example:</div>
                  <div className="text-red-700 italic">{selectedDefinition.nonexample1}</div>
                </div>
              )}
              
              {selectedDefinition.nonexample2 && (
                <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                  <div className="font-medium text-red-800 mb-2">Non-example 2:</div>
                  <div className="text-red-700 italic">{selectedDefinition.nonexample2}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Legacy Definition Popup (for backward compatibility) */}
      {definitionPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Feature Definition
                </h3>
                <button
                  onClick={() => setDefinitionPopup(null)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-3">
                <div className="bg-blue-50 px-3 py-2 rounded-lg border-l-4 border-blue-400">
                  <div className="font-medium text-blue-900">{definitionPopup.code}</div>
                </div>
                
                <div className="text-gray-700 leading-relaxed">
                  {definitionPopup.definition}
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setDefinitionPopup(null)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 