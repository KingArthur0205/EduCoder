"use client";

import { useState, useEffect, useRef, useCallback } from 'react';

interface FeatureDefinitionsViewerProps {
  isOpen: boolean;
  onClose: () => void;
  refreshTrigger?: number;
}

interface FeatureDefinition {
  Code: string;
  Definition: string;
  Example1?: string;
  Example2?: string;
  NonExample1?: string;
  NonExample2?: string;
}

interface FeatureData {
  categories: string[];
  data: { [category: string]: FeatureDefinition[] };
  uploadedAt?: string;
  originalFileName?: string;
}

interface ParsedFeature {
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
}

export default function FeatureDefinitionsViewer({ isOpen, onClose, refreshTrigger }: FeatureDefinitionsViewerProps) {
  const [featureData, setFeatureData] = useState<FeatureData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const loadFeatureDefinitions = useCallback(async () => {
    setLoading(true);
    try {
      // First check localStorage for uploaded feature definitions
      const storedFeatureDefinitions = localStorage.getItem('feature-definitions');
      if (storedFeatureDefinitions) {
        try {
          const parsedData = JSON.parse(storedFeatureDefinitions);
          console.log('Loading feature definitions from localStorage:', parsedData);
          
          // Convert the stored format to the viewer format
          const viewerData: FeatureData = {
            categories: parsedData.categories || [],
            data: {},
            uploadedAt: parsedData.uploadedAt,
            originalFileName: parsedData.originalFileName
          };
          
          // Convert features format to match viewer expectations
          if (parsedData.features) {
            Object.keys(parsedData.features).forEach(category => {
              viewerData.data[category] = parsedData.features[category].map((feature: ParsedFeature) => ({
                Code: feature.Code || '',
                Definition: feature.Definition || '',
                Example1: feature.Example1 || feature.example1 || '',
                Example2: feature.Example2 || feature.example2 || '',
                NonExample1: feature.NonExample1 || feature.nonexample1 || '',
                NonExample2: feature.NonExample2 || feature.nonexample2 || ''
              }));
            });
          }
          
          setFeatureData(viewerData);
          setSelectedCategory(viewerData.categories[0] || null);
          setLoading(false);
          return;
        } catch (error) {
          console.error('Error parsing localStorage feature definitions:', error);
          // Continue to fallback methods
        }
      }

      // Fallback: Get categories from API
      const categoriesResponse = await fetch('/api/get-feature-categories');
      const categoriesData = await categoriesResponse.json();

      if (categoriesData.success) {
        // Try to load from feature-definitions.json first
        try {
          const jsonResponse = await fetch('/feature-definitions.json');
          if (jsonResponse.ok) {
            const jsonData = await jsonResponse.json();
            setFeatureData(jsonData);
            setSelectedCategory(jsonData.categories[0] || null);
            setLoading(false);
            return;
          }
        } catch {
          console.log('No feature-definitions.json found, loading from XLSX');
        }

        // Fallback to loading from XLSX
        const xlsxResponse = await fetch('/MOL%20Roles%20Features.xlsx');
        if (xlsxResponse.ok) {
          // We'll parse this on the client side using the same logic
          const arrayBuffer = await xlsxResponse.arrayBuffer();
          const data = await parseXLSXFeatureData(arrayBuffer, categoriesData.categories);
          setFeatureData(data);
          setSelectedCategory(categoriesData.categories[0] || null);
        } else {
          throw new Error('No feature definition files found');
        }
      }
    } catch (error) {
      console.error('Error loading feature definitions:', error);
      setFeatureData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load feature definitions when modal opens
  useEffect(() => {
    if (isOpen) {
      loadFeatureDefinitions();
    }
  }, [isOpen, loadFeatureDefinitions]);

  // Refresh when refreshTrigger changes (when new feature definitions are uploaded)
  useEffect(() => {
    if (isOpen && refreshTrigger) {
      loadFeatureDefinitions();
    }
  }, [refreshTrigger, isOpen, loadFeatureDefinitions]);

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const parseXLSXFeatureData = async (arrayBuffer: ArrayBuffer, categories: string[]): Promise<FeatureData> => {
    // Import XLSX dynamically to avoid SSR issues
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(arrayBuffer);
    
    const data: { [category: string]: FeatureDefinition[] } = {};
    
    categories.forEach(category => {
      if (workbook.SheetNames.includes(category)) {
        const sheet = workbook.Sheets[category];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as Record<string, string>[];
        
        data[category] = jsonData.map(row => ({
          Code: row.Code || row.code || '',
          Definition: row.Definition || row.definition || '',
          Example1: row.Example1 || row.example1 || '',
          Example2: row.Example2 || row.example2 || '',
          NonExample1: row.NonExample1 || row.nonexample1 || '',
          NonExample2: row.NonExample2 || row.nonexample2 || ''
        }));
      }
    });

    return {
      categories,
      data,
      originalFileName: 'MOL Roles Features.xlsx'
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
      <div 
        ref={modalRef}
        className="bg-blue-50 border-2 border-blue-300 rounded-lg shadow-lg max-w-7xl w-full mx-4 max-h-[95vh] overflow-hidden"
      >
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-blue-800">Current Feature Definitions</h2>
            <button
              onClick={onClose}
              className="text-blue-500 hover:text-blue-700 text-2xl"
            >
              ×
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <svg className="animate-spin mx-auto w-8 h-8 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <div className="text-blue-600 font-medium">Loading feature definitions...</div>
            </div>
          ) : featureData ? (
            <div className="flex h-[600px]">
              {/* Category Sidebar */}
              <div className="w-1/4 border-r border-blue-200 pr-4 flex flex-col">
                <h3 className="font-semibold text-blue-800 mb-3">Categories</h3>
                <div className="space-y-2 overflow-y-auto flex-1">
                  {featureData.categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`w-full text-left px-3 py-2 rounded-md transition ${
                        selectedCategory === category
                          ? 'bg-blue-600 text-white font-medium shadow-md'
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      }`}
                    >
                      {category}
                      <span className={`text-xs block ${
                        selectedCategory === category ? 'text-blue-100' : 'text-blue-400'
                      }`}>
                        {featureData.data[category]?.length || 0} features
                      </span>
                    </button>
                  ))}
                </div>
                
                {featureData.originalFileName && (
                  <div className="mt-4 text-xs text-blue-600 bg-blue-100 p-2 rounded">
                    <div>Source: {featureData.originalFileName}</div>
                    {featureData.uploadedAt && (
                      <div>Updated: {new Date(featureData.uploadedAt).toLocaleDateString()}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Feature Details */}
              <div className="w-3/4 pl-4 overflow-y-auto">
                {selectedCategory && featureData.data[selectedCategory] ? (
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-4">
                      {selectedCategory} Features ({featureData.data[selectedCategory].length})
                    </h3>
                    <div className="space-y-4">
                      {featureData.data[selectedCategory].map((feature, index) => (
                        <div key={index} className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                          <div className="flex items-start justify-between mb-3">
                            <h4 className="font-semibold text-blue-800 text-lg">{feature.Code}</h4>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="text-sm text-gray-700">
                              <strong className="text-blue-800">Definition:</strong>
                              <div className="mt-1">{feature.Definition}</div>
                            </div>
                            
                            {feature.Example1 && (
                              <div className="text-sm text-green-700">
                                <strong className="text-green-800">Example:</strong>
                                <div className="mt-1">{feature.Example1}</div>
                              </div>
                            )}
                            
                            {feature.Example2 && (
                              <div className="text-sm text-green-700">
                                <strong className="text-green-800">Example 2:</strong>
                                <div className="mt-1">{feature.Example2}</div>
                              </div>
                            )}
                            
                            {feature.NonExample1 && (
                              <div className="text-sm text-red-700">
                                <strong className="text-red-800">Non-example:</strong>
                                <div className="mt-1">{feature.NonExample1}</div>
                              </div>
                            )}
                            
                            {feature.NonExample2 && (
                              <div className="text-sm text-red-700">
                                <strong className="text-red-800">Non-example 2:</strong>
                                <div className="mt-1">{feature.NonExample2}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-blue-600 py-8 bg-blue-100 rounded-lg">
                    <svg className="mx-auto w-12 h-12 text-blue-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-lg font-medium">Select a category to view its features</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <svg className="mx-auto w-16 h-16 text-blue-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-blue-600 text-lg font-medium">No feature definitions found</div>
              <p className="text-sm text-blue-500 mt-2">
                Upload a feature definition file to get started
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 