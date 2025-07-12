"use client";

import { useState, useEffect } from 'react';

interface LLMAnnotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnnotationComplete: (annotations: Record<string, Record<string, Record<string, boolean>>>, provider?: string) => void;
  transcriptId: string;
  transcriptData: Array<{
    lineNumber: number;
    speaker: string;
    utterance: string;
  }>;
  featureDefinitions: {
    categories: string[];
    features: {
      [category: string]: Array<{
        Code: string;
        Definition: string;
        Example1?: string;
        Example2?: string;
        NonExample1?: string;
        NonExample2?: string;
      }>;
    };
  };
}

export default function LLMAnnotationModal({
  isOpen,
  onClose,
  onAnnotationComplete,
  transcriptId,
  transcriptData,
  featureDefinitions
}: LLMAnnotationModalProps) {
  const [llmProvider, setLlmProvider] = useState<'openai' | 'claude'>('openai');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [machinePrompt, setMachinePrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');
  const [startLine, setStartLine] = useState<number>(1);
  const [endLine, setEndLine] = useState<number>(transcriptData.length);
  const [selectedFeatures, setSelectedFeatures] = useState<{[category: string]: string[]}>({});

  // Load default prompts from settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadDefaultPrompts();
      setStartLine(1);
      setEndLine(transcriptData.length);
      
      // Initialize all features as selected by default
      const allSelected: {[category: string]: string[]} = {};
      featureDefinitions.categories.forEach(category => {
        allSelected[category] = featureDefinitions.features[category]?.map(f => f.Code) || [];
      });
      setSelectedFeatures(allSelected);
    }
  }, [isOpen, transcriptData.length, featureDefinitions]);

  const loadDefaultPrompts = async () => {
    try {
      const response = await fetch('/api/save-settings');
      const data = await response.json();
      
      if (data.success) {
        setSystemPrompt(data.settings.defaultSystemPrompt || 'You are an expert educational researcher analyzing classroom transcripts. Your task is to identify specific educational features in the dialogue.');
        setMachinePrompt(data.settings.defaultMachinePrompt || 'Please analyze the following classroom transcript and identify which educational features are present in each line. For each line, indicate whether each feature is present (true) or absent (false).');
      }
    } catch (error) {
      console.error('Error loading default prompts:', error);
      // Set fallback prompts
      setSystemPrompt('You are an expert educational researcher analyzing classroom transcripts. Your task is to identify specific educational features in the dialogue.');
      setMachinePrompt('Please analyze the following classroom transcript and identify which educational features are present in each line. For each line, indicate whether each feature is present (true) or absent (false).');
    }
  };

  const handleAnnotate = async () => {
    if (!systemPrompt.trim() || !machinePrompt.trim()) {
      setError('Please provide both system and machine prompts.');
      return;
    }

    // Validate line range
    if (startLine < 1 || endLine > transcriptData.length || startLine > endLine) {
      setError(`Please enter a valid line range between 1 and ${transcriptData.length}.`);
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(`Initializing LLM annotation for lines ${startLine} to ${endLine}...`);

    try {
      // Filter transcript data to the selected range
      const selectedTranscriptData = transcriptData.slice(startLine - 1, endLine);

      // Filter feature definitions to only include selected features
      const filteredFeatureDefinitions = {
        categories: featureDefinitions.categories.filter(category => 
          selectedFeatures[category] && selectedFeatures[category].length > 0
        ),
        features: Object.fromEntries(
          Object.entries(selectedFeatures).map(([category, codes]) => [
            category,
            featureDefinitions.features[category]?.filter(f => codes.includes(f.Code)) || []
          ]).filter(([, features]) => features.length > 0)
        )
      };

      const response = await fetch('/api/annotate-with-llm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcriptId,
          llmProvider,
          systemPrompt: systemPrompt.trim(),
          machinePrompt: machinePrompt.trim(),
          featureDefinitions: filteredFeatureDefinitions,
          transcriptData: selectedTranscriptData,
          startLineOffset: startLine - 1 // Pass the offset so API knows the actual line numbers
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProgress('Annotation completed successfully!');
        setTimeout(() => {
          onAnnotationComplete(data.annotations, llmProvider);
          onClose();
        }, 1000);
      } else {
        setError(data.error || 'Failed to generate annotations');
      }
    } catch (error) {
      console.error('LLM annotation error:', error);
      setError('An error occurred while generating annotations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFeatureCategory = (category: string, selectAll: boolean) => {
    setSelectedFeatures(prev => ({
      ...prev,
      [category]: selectAll 
        ? (featureDefinitions.features[category]?.map(f => f.Code) || [])
        : []
    }));
  };

  const toggleIndividualFeature = (category: string, featureCode: string) => {
    setSelectedFeatures(prev => {
      const currentCategoryFeatures = prev[category] || [];
      const isSelected = currentCategoryFeatures.includes(featureCode);
      
      return {
        ...prev,
        [category]: isSelected
          ? currentCategoryFeatures.filter(code => code !== featureCode)
          : [...currentCategoryFeatures, featureCode]
      };
    });
  };

  const getSelectedFeatureCount = () => {
    return Object.values(selectedFeatures).reduce((sum, features) => sum + features.length, 0);
  };

  const getTotalFeatureCount = () => {
    return Object.values(featureDefinitions.features).reduce((sum, features) => sum + features.length, 0);
  };

  const handleClose = () => {
    if (!isLoading) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">Annotate with LLM</h2>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-500 hover:text-gray-700 text-2xl disabled:opacity-50"
            >
              ×
            </button>
          </div>

          <div className="space-y-6">
            {/* LLM Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                LLM Provider
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="openai"
                    checked={llmProvider === 'openai'}
                    onChange={(e) => setLlmProvider(e.target.value as 'openai' | 'claude')}
                    disabled={isLoading}
                    className="mr-2"
                  />
                  <span className="text-sm">OpenAI (GPT-4)</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="claude"
                    checked={llmProvider === 'claude'}
                    onChange={(e) => setLlmProvider(e.target.value as 'openai' | 'claude')}
                    disabled={isLoading}
                    className="mr-2"
                  />
                  <span className="text-sm">Claude (Claude-4 Sonnet)</span>
                </label>
              </div>
            </div>

            {/* Line Range Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Line Range to Annotate
              </label>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">From:</label>
                  <input
                    type="number"
                    min="1"
                    max={transcriptData.length}
                    value={startLine}
                    onChange={(e) => setStartLine(Math.max(1, Math.min(transcriptData.length, parseInt(e.target.value) || 1)))}
                    disabled={isLoading}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">To:</label>
                  <input
                    type="number"
                    min="1"
                    max={transcriptData.length}
                    value={endLine}
                    onChange={(e) => setEndLine(Math.max(1, Math.min(transcriptData.length, parseInt(e.target.value) || transcriptData.length)))}
                    disabled={isLoading}
                    className="w-20 px-2 py-1 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStartLine(1);
                      setEndLine(transcriptData.length);
                    }}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    All Lines
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const mid = Math.ceil(transcriptData.length / 2);
                      setStartLine(1);
                      setEndLine(mid);
                    }}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    First Half
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const mid = Math.ceil(transcriptData.length / 2);
                      setStartLine(mid + 1);
                      setEndLine(transcriptData.length);
                    }}
                    disabled={isLoading}
                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                  >
                    Second Half
                  </button>
                </div>
              </div>
                             <p className="text-xs text-gray-500 mt-1">
                 Total transcript has {transcriptData.length} lines. Selected range: {Math.max(0, endLine - startLine + 1)} lines.
               </p>
             </div>

            {/* Feature Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features to Annotate
              </label>
              <div className="bg-gray-50 p-3 rounded-md max-h-48 overflow-y-auto">
                <div className="mb-3 flex justify-between items-center">
                  <span className="text-sm text-gray-600">
                    Selected: {getSelectedFeatureCount()} of {getTotalFeatureCount()} features
                  </span>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        const allSelected: {[category: string]: string[]} = {};
                        featureDefinitions.categories.forEach(category => {
                          allSelected[category] = featureDefinitions.features[category]?.map(f => f.Code) || [];
                        });
                        setSelectedFeatures(allSelected);
                      }}
                      disabled={isLoading}
                      className="px-2 py-1 text-xs bg-blue-200 text-blue-700 rounded-md hover:bg-blue-300 disabled:opacity-50"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedFeatures({})}
                      disabled={isLoading}
                      className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
                
                {featureDefinitions.categories.map(category => {
                  const categoryFeatures = featureDefinitions.features[category] || [];
                  const selectedCategoryFeatures = selectedFeatures[category] || [];
                  const allSelected = selectedCategoryFeatures.length === categoryFeatures.length;
                  const someSelected = selectedCategoryFeatures.length > 0;
                  
                  return (
                    <div key={category} className="mb-4 last:mb-0">
                      <div className="flex items-center mb-2">
                        <label className="flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            ref={input => {
                              if (input) input.indeterminate = someSelected && !allSelected;
                            }}
                            onChange={(e) => toggleFeatureCategory(category, e.target.checked)}
                            disabled={isLoading}
                            className="mr-2"
                          />
                          <span className="font-medium text-sm text-gray-700">
                            {category} ({selectedCategoryFeatures.length}/{categoryFeatures.length})
                          </span>
                        </label>
                      </div>
                      <div className="ml-6 grid grid-cols-2 gap-1">
                        {categoryFeatures.map(feature => (
                          <label key={feature.Code} className="flex items-center cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={selectedCategoryFeatures.includes(feature.Code)}
                              onChange={() => toggleIndividualFeature(category, feature.Code)}
                              disabled={isLoading}
                              className="mr-1 scale-75"
                            />
                            <span className="text-gray-600 truncate" title={feature.Definition}>
                              {feature.Code}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Select which features the LLM should annotate. Fewer features = faster processing.
              </p>
            </div>

            {/* System Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter the system prompt for the LLM..."
                disabled={isLoading}
                className="w-full h-32 p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                This defines the role and context for the LLM
              </p>
            </div>

            {/* Machine Prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Machine Prompt
              </label>
              <textarea
                value={machinePrompt}
                onChange={(e) => setMachinePrompt(e.target.value)}
                placeholder="Enter the machine prompt for the LLM..."
                disabled={isLoading}
                className="w-full h-32 p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                This provides specific instructions for the annotation task
              </p>
            </div>

            {/* Feature Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features to Annotate
              </label>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-600">
                  {featureDefinitions.categories.map(category => (
                    <div key={category} className="mb-2">
                      <strong>{category}:</strong>{' '}
                      {featureDefinitions.features[category]?.map(f => f.Code).join(', ')}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Total: {featureDefinitions.categories.length} categories,{' '}
                  {Object.values(featureDefinitions.features).reduce((sum, features) => sum + features.length, 0)} features
                </div>
              </div>
            </div>

            {/* Transcript Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transcript Summary
              </label>
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm text-gray-600">
                  <div><strong>Total transcript lines:</strong> {transcriptData.length}</div>
                  <div><strong>Selected range:</strong> Lines {startLine} to {endLine} ({Math.max(0, endLine - startLine + 1)} lines)</div>
                  <div><strong>Speakers:</strong> {Array.from(new Set(transcriptData.map(line => line.speaker))).join(', ')}</div>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Progress Message */}
            {progress && (
              <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
                {progress}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={handleClose}
                disabled={isLoading}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAnnotate}
                disabled={isLoading || !systemPrompt.trim() || !machinePrompt.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 transition flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Annotating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Start Annotation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 