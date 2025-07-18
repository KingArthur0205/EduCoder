import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

export interface FeatureDetails {
  Definition: string;
  example1: string;
  example2: string;
  nonexample1: string;
  nonexample2: string;
}

export interface AnnotationData {
  [sheetName: string]: {
    codes: string[];
    definitions: { [code: string]: FeatureDetails };
    annotations: {
      [rowIndex: number]: {
        [code: string]: boolean;
      };
    };
  };
}

interface Props {
  numRows: number;
  onSave: (data: AnnotationData) => void;
  savedData?: AnnotationData;
  onAnnotationChange?: (data: AnnotationData) => void;
}

// ALLOWED_SHEETS will be loaded dynamically from API
let ALLOWED_SHEETS: string[] = []; // Will be populated dynamically

  // Function to parse XLSX annotation data (extracted from existing logic)
const parseXLSXAnnotationData = (arrayBuffer: ArrayBuffer, numRows: number, savedData?: AnnotationData): AnnotationData => {
    const workbook = XLSX.read(arrayBuffer);
    console.log('AnnotationPanel: Excel file loaded. Sheet names:', workbook.SheetNames);
    console.log('AnnotationPanel: Allowed sheets:', ALLOWED_SHEETS);
    
    const data: AnnotationData = {};
    
    // Process all sheets in the workbook
    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        // Extract codes and definitions
        const codes = (jsonData as {Code?: string}[]).map(row => row.Code).filter((code): code is string => Boolean(code));
        const definitions: { [code: string]: FeatureDetails } = {};
        
        (jsonData as {
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
        }[]).forEach((row) => {
          if (row.Code) {
            definitions[row.Code] = {
              Definition: row.Definition || '',
              example1: row.Example1 || row.example1 || '',
              example2: row.Example2 || row.example2 || '',
              nonexample1: row.NonExample1 || row.nonexample1 || '',
              nonexample2: row.NonExample2 || row.nonexample2 || ''
            };
          }
        });
        
        // Initialize annotations for each line
        const annotations: { [rowIndex: number]: { [code: string]: boolean } } = {};
        for (let i = 0; i < numRows; i++) {
          annotations[i] = {};
          codes.forEach(code => {
            annotations[i][code] = false;
          });
        }
        
        data[sheetName] = {
          codes,
          definitions,
          annotations: savedData?.[sheetName]?.annotations || annotations
        };
      });
    
    return data;
  };

// Function to parse XLSX and save feature definitions to localStorage
const parseAndSaveDefaultCodebook = async (arrayBuffer: ArrayBuffer) => {
  try {
    console.log('AnnotationPanel: Parsing default Codebook.xlsx to extract feature definitions...');
    
    // Import XLSX dynamically to avoid SSR issues
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(arrayBuffer);
    
    const categories: string[] = [];
    const features: { [category: string]: Array<{
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
    }> } = {};
    
    // Process each sheet as a category
    workbook.SheetNames.forEach((sheetName) => {
      console.log(`Processing sheet: ${sheetName}`);
      
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
      
      if (jsonData.length === 0) {
        console.warn(`Empty sheet: ${sheetName} - skipping`);
        return;
      }
      
      // Get headers from first row
      const headers = jsonData[0] as string[];
      console.log(`Headers: ${JSON.stringify(headers)}`);
      
      const codeIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('code'));
      const definitionIndex = headers.findIndex(h => h && h.toString().toLowerCase().includes('definition'));
      
      if (codeIndex === -1) {
        console.warn(`No 'Code' column found in sheet: ${sheetName} - skipping`);
        return;
      }
      
      // Extract features from remaining rows
      const sheetFeatures: Array<{
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
      }> = [];
      
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as unknown[];
        if (row && row[codeIndex] && String(row[codeIndex]).trim() !== '') {
          const feature: Record<string, string> = {
            Code: String(row[codeIndex]).trim(),
            Definition: definitionIndex !== -1 && row[definitionIndex] 
              ? String(row[definitionIndex]).trim() 
              : ''
          };
          
          // Add any additional columns
          headers.forEach((header, index) => {
            if (index !== codeIndex && index !== definitionIndex && row[index]) {
              feature[String(header)] = String(row[index]).trim();
            }
          });
          
          sheetFeatures.push(feature);
        }
      }
      
      console.log(`Extracted ${sheetFeatures.length} features from sheet "${sheetName}"`);
      if (sheetFeatures.length > 0) {
        categories.push(sheetName);
        features[sheetName] = sheetFeatures;
      }
    });
    
    // Save feature definitions to localStorage in the expected format
    const featureDefinitions = {
      uploadedAt: new Date().toISOString(),
      originalFileName: 'Codebook.xlsx',
      isXLSX: true,
      categories: categories,
      features: features
    };
    
    localStorage.setItem('feature-definitions', JSON.stringify(featureDefinitions));
    console.log('AnnotationPanel: Default feature definitions saved to localStorage:', featureDefinitions);
    console.log('Categories detected:', categories);
    
  } catch (error) {
    console.error('AnnotationPanel: Error parsing default codebook:', error);
  }
};

export default function AnnotationPanel({ numRows, onSave, savedData, onAnnotationChange }: Props) {
  const [sheetNames, setSheetNames] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null);
  const [annotationData, setAnnotationData] = useState<AnnotationData>({});
  const [loading, setLoading] = useState(true);
  const [isGeneratedFromCodebook, setIsGeneratedFromCodebook] = useState(false);

  useEffect(() => {
    const loadFeatureCategoriesAndAnnotationData = async () => {
      try {
        console.log('AnnotationPanel: Loading feature categories and definitions...');
        
        // First, try to load from localStorage
        const localFeatureDefinitions = localStorage.getItem('feature-definitions');
        
        if (localFeatureDefinitions) {
          // Load from localStorage
          console.log('AnnotationPanel: Loading feature definitions from localStorage');
          const featureData = JSON.parse(localFeatureDefinitions);
          console.log('AnnotationPanel: localStorage data structure:', featureData);
          console.log('AnnotationPanel: Object keys:', Object.keys(featureData));
          console.log('AnnotationPanel: Has categories?', !!featureData.categories);
          console.log('AnnotationPanel: Has features?', !!featureData.features);
          
          // Check if it's the new direct format (category names as keys)
          const isDirectFormat = typeof featureData === 'object' && 
                                featureData !== null && 
                                !featureData.categories && 
                                !featureData.features &&
                                Object.keys(featureData).length > 0;
          console.log('AnnotationPanel: Direct format check:', isDirectFormat);
          
          if (isDirectFormat) {
            // Direct format: { "Conceptual": [...], "Discursive": [...] }
            const categories = Object.keys(featureData);
            ALLOWED_SHEETS = categories;
            console.log('AnnotationPanel: Loaded categories from localStorage (direct format):', ALLOWED_SHEETS);
            
            // Convert localStorage feature data to annotation data format
            const data: AnnotationData = {};
            
            categories.forEach((category: string) => {
              const categoryFeatures = featureData[category] || [];
              
              // Extract codes
              const codes = categoryFeatures.map((feature: { Code?: string }) => feature.Code).filter(Boolean);
              
              // Create definitions object
              const definitions: { [code: string]: FeatureDetails } = {};
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
              
              // Initialize annotations for each line
              const annotations: { [rowIndex: number]: { [code: string]: boolean } } = {};
              for (let i = 0; i < numRows; i++) {
                annotations[i] = {};
                codes.forEach((code: string) => {
                  annotations[i][code] = false;
                });
              }
              
              data[category] = {
                codes,
                definitions,
                annotations: savedData?.[category]?.annotations || annotations
              };
            });
            
            setAnnotationData(data);
            setSheetNames(Object.keys(data));
            setLoading(false);
            setIsGeneratedFromCodebook(true);
            
            // If there's saved data, make sure it's reflected in the UI immediately
            if (savedData) {
              onAnnotationChange?.(savedData);
            } else {
              onAnnotationChange?.(data);
            }
            return;
          }
          
          // Legacy format: { categories: [...], features: {...} }
          if (featureData.categories && featureData.features) {
            ALLOWED_SHEETS = featureData.categories;
            console.log('AnnotationPanel: Loaded categories from localStorage (legacy format):', ALLOWED_SHEETS);
            
            // Convert localStorage feature data to annotation data format
            const data: AnnotationData = {};
            
            featureData.categories.forEach((category: string) => {
              const categoryFeatures = featureData.features[category] || [];
              
              // Extract codes
              const codes = categoryFeatures.map((feature: { Code?: string }) => feature.Code).filter(Boolean);
              
              // Create definitions object
              const definitions: { [code: string]: FeatureDetails } = {};
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
              
              // Initialize annotations for each line
              const annotations: { [rowIndex: number]: { [code: string]: boolean } } = {};
              for (let i = 0; i < numRows; i++) {
                annotations[i] = {};
                codes.forEach((code: string) => {
                  annotations[i][code] = false;
                });
              }
              
              data[category] = {
                codes,
                definitions,
                annotations: savedData?.[category]?.annotations || annotations
              };
            });
            
            setAnnotationData(data);
            setSheetNames(Object.keys(data));
            setLoading(false);
            setIsGeneratedFromCodebook(true);
            
            // If there's saved data, make sure it's reflected in the UI immediately
            if (savedData) {
              onAnnotationChange?.(savedData);
            } else {
              onAnnotationChange?.(data);
            }
            return;
          }
        }
        
        // Default: try to load Codebook.xlsx from public folder
        console.log('AnnotationPanel: No localStorage data, loading default Codebook.xlsx...');
        try {
          const xlsxResponse = await fetch('/Codebook.xlsx');
          if (xlsxResponse.ok) {
            const arrayBuffer = await xlsxResponse.arrayBuffer();
            
            // Parse the XLSX to extract feature definitions and save to localStorage
            await parseAndSaveDefaultCodebook(arrayBuffer);
            
            const data = parseXLSXAnnotationData(arrayBuffer, numRows, savedData);
            console.log('AnnotationPanel: Default Codebook.xlsx loaded successfully');
            
            setAnnotationData(data);
            setSheetNames(Object.keys(data));
            setLoading(false);
            setIsGeneratedFromCodebook(true);
            
            // If there's saved data, make sure it's reflected in the UI immediately
            if (savedData) {
              onAnnotationChange?.(savedData);
            } else {
              onAnnotationChange?.(data);
            }
            return;
          }
        } catch (error) {
          console.warn('AnnotationPanel: Failed to load default Codebook.xlsx:', error);
        }
        
        // Fallback: try API for feature categories
        console.log('AnnotationPanel: Default codebook failed, trying API...');
        const categoriesResponse = await fetch('/api/get-feature-categories');
        const categoriesData = await categoriesResponse.json();
        
        if (categoriesData.success && categoriesData.categories.length > 0) {
          ALLOWED_SHEETS = categoriesData.categories;
          console.log('AnnotationPanel: Loaded feature categories from API:', ALLOWED_SHEETS);
          
          // Try to load the hardcoded XLSX file as fallback
          console.log('AnnotationPanel: Loading XLSX file /MOL Roles Features.xlsx');
          const xlsxResponse = await fetch('/MOL%20Roles%20Features.xlsx');
          if (!xlsxResponse.ok) {
            throw new Error(`Failed to fetch annotation file: ${xlsxResponse.statusText}`);
          }
          const arrayBuffer = await xlsxResponse.arrayBuffer();
          const data = parseXLSXAnnotationData(arrayBuffer, numRows, savedData);
          console.log('AnnotationPanel: XLSX data parsed successfully');
          
          setAnnotationData(data);
          setSheetNames(Object.keys(data));
          setLoading(false);
          
          // If there's saved data, make sure it's reflected in the UI immediately
          if (savedData) {
            onAnnotationChange?.(savedData);
          } else {
            onAnnotationChange?.(data);
          }
        } else {
          // No feature definitions available
          console.log('AnnotationPanel: No feature definitions found');
          setAnnotationData({});
          setSheetNames([]);
          setLoading(false);
        }
        
      } catch (error) {
        console.error('Error loading annotation data:', error);
        setLoading(false);
      }
    };
    
    loadFeatureCategoriesAndAnnotationData();
  }, [numRows, savedData, onAnnotationChange]);

  const handleAnnotationChange = (lineNumber: number, code: string, value: boolean) => {
    if (!selectedSheet) return;
    
    const newData = {
      ...annotationData,
      [selectedSheet]: {
        ...annotationData[selectedSheet],
        annotations: {
          ...annotationData[selectedSheet].annotations,
          [lineNumber]: {
            ...annotationData[selectedSheet].annotations[lineNumber],
            [code]: value
          }
        }
      }
    };
    
    setAnnotationData(newData);
    onAnnotationChange?.(newData);
  };

  const handleSave = () => {
    onSave(annotationData);
  };

  if (loading) {
    return <div>Loading annotation data...</div>;
  }

  if (sheetNames.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <h3 className="text-lg font-medium mb-2">No Feature Definitions</h3>
        <p className="text-center max-w-md">
          Please upload a feature definition file to enable annotation features. 
          Go to the main page and use the &quot;Upload Feature Definition&quot; section.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {isGeneratedFromCodebook && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2 text-green-700 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Annotation columns automatically generated from uploaded codebook</span>
          </div>
        </div>
      )}
      
      <div className="flex flex-wrap gap-2 mb-4">
        {sheetNames.map(sheetName => (
          <button
            key={sheetName}
            onClick={() => setSelectedSheet(sheetName === selectedSheet ? null : sheetName)}
            className={`px-3 py-1 rounded-md ${
              sheetName === selectedSheet 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
          >
            {sheetName}
          </button>
        ))}
      </div>

      {selectedSheet && (
        <div className="flex flex-col h-full">
          <div className="flex-grow overflow-hidden">
            <table className="min-w-full border-collapse">
              <thead className="sticky top-0 bg-white z-10">
                <tr>
                  {annotationData[selectedSheet].codes.map(code => (
                    <th
                      key={code}
                      className="border border-gray-300 px-2 py-1 text-sm"
                      title={annotationData[selectedSheet].definitions[code].Definition}
                    >
                      {code}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: numRows }).map((_, idx) => (
                  <tr key={idx} className="h-10">
                    {annotationData[selectedSheet].codes.map(code => (
                      <td key={code} className="border border-gray-300 px-2 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={annotationData[selectedSheet].annotations[idx][code]}
                          onChange={(e) => handleAnnotationChange(idx, code, e.target.checked)}
                          className="h-4 w-4"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <button
            onClick={handleSave}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            Save Annotations
          </button>
        </div>
      )}
    </div>
  );
} 