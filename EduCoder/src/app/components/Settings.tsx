"use client";

import { useState, useEffect, useRef } from 'react';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const [googleCredentialsBase64, setGoogleCredentialsBase64] = useState('');
  const [googleCloudBucketName, setGoogleCloudBucketName] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [claudeApiKey, setClaudeApiKey] = useState('');
  const [defaultSystemPrompt, setDefaultSystemPrompt] = useState('');
  const [defaultMachinePrompt, setDefaultMachinePrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showEnvModal, setShowEnvModal] = useState(false);
  const [showLLMModal, setShowLLMModal] = useState(false);
  const [isServerless, setIsServerless] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load current settings when component opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't close if any modal is open
      if (showEnvModal || showLLMModal) {
        return;
      }
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose, showEnvModal, showLLMModal]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/save-settings');
      const data = await response.json();
      
      if (data.success) {
        setGoogleCredentialsBase64(data.settings.googleCredentialsBase64 || '');
        setGoogleCloudBucketName(data.settings.googleCloudBucketName || '');
        setOpenaiApiKey(data.settings.openaiApiKey || '');
        setClaudeApiKey(data.settings.claudeApiKey || '');
        setDefaultSystemPrompt(data.settings.defaultSystemPrompt || 'You are an expert educational researcher analyzing classroom transcripts. Your task is to identify specific educational features in the dialogue.');
        setDefaultMachinePrompt(data.settings.defaultMachinePrompt || 'Please analyze the following classroom transcript and identify which educational features are present in each line. For each line, indicate whether each feature is present (true) or absent (false).');
        setIsServerless(data.isServerless || false);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      setMessage('Error loading current settings');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseModal = () => {
    setShowEnvModal(false);
    setShowLLMModal(false);
    setMessage('');
  };

  const saveSettings = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/save-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleCredentialsBase64,
          googleCloudBucketName,
          openaiApiKey,
          claudeApiKey,
          defaultSystemPrompt,
          defaultMachinePrompt,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage('Settings saved successfully!');
        setTimeout(() => {
          setMessage('');
          setShowEnvModal(false);
          setShowLLMModal(false);
          onClose();
        }, 2000);
      } else {
        setMessage('Error saving settings: ' + data.error);
        if (data.isServerless) {
          setIsServerless(true);
        }
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setMessage('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Settings Dropdown */}
      <div 
        ref={dropdownRef}
        className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 min-w-64 z-50"
      >
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Settings</h3>
          
          <div className="space-y-2">
            <button
              onClick={() => setShowEnvModal(true)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              Configure Google Cloud
            </button>
            
            <button
              onClick={() => setShowLLMModal(true)}
              className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              Configure LLM Settings
            </button>
          </div>
        </div>
      </div>

      {/* Environment Variables Modal */}
      {showEnvModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Configure Google Cloud</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div className="text-gray-600">Loading settings...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Credentials (Base64)
                    </label>
                    <textarea
                      value={googleCredentialsBase64}
                      onChange={(e) => setGoogleCredentialsBase64(e.target.value)}
                      placeholder="Paste your base64-encoded Google service account credentials here..."
                      className="w-full h-32 p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      This should be your Google service account JSON file encoded in base64
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Google Cloud Bucket Name
                    </label>
                    <input
                      type="text"
                      value={googleCloudBucketName}
                      onChange={(e) => setGoogleCloudBucketName(e.target.value)}
                      placeholder="your-bucket-name"
                      className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      The name of your Google Cloud Storage bucket
                    </p>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-md ${
                      message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {message}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveSettings}
                      disabled={saving || isServerless}
                      className={`px-4 py-2 text-white rounded-md transition ${
                        isServerless 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300'
                      }`}
                    >
                      {saving ? 'Saving...' : isServerless ? 'Cannot Save (Deployed)' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LLM Settings Modal */}
      {showLLMModal && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Configure LLM Settings</h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {loading ? (
                <div className="text-center py-4">
                  <div className="text-gray-600">Loading settings...</div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Serverless Environment Warning */}
                  {isServerless && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">
                            Deployed Environment Detected
                          </h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>Settings cannot be saved in the deployed environment. To configure API keys and settings:</p>
                            <ol className="mt-2 ml-4 list-decimal">
                              <li>Go to your hosting provider&apos;s dashboard (e.g., Vercel)</li>
                              <li>Navigate to Environment Variables</li>
                              <li>Add the following environment variables:</li>
                              <ul className="mt-1 ml-4 list-disc text-xs">
                                <li><code>OPENAI_API_KEY</code> - Your OpenAI API key</li>
                                <li><code>CLAUDE_API_KEY</code> - Your Claude API key</li>
                                <li><code>DEFAULT_SYSTEM_PROMPT</code> - Default system prompt</li>
                                <li><code>DEFAULT_MACHINE_PROMPT</code> - Default machine prompt</li>
                              </ul>
                              <li>Redeploy your application</li>
                            </ol>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OpenAI API Key
                    </label>
                    <input
                      type="password"
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                      placeholder="sk-..."
                      readOnly={isServerless}
                      className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isServerless ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {isServerless ? 'Set as OPENAI_API_KEY environment variable' : 'Your OpenAI API key for GPT models'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Claude API Key
                    </label>
                    <input
                      type="password"
                      value={claudeApiKey}
                      onChange={(e) => setClaudeApiKey(e.target.value)}
                      placeholder="sk-ant-..."
                      readOnly={isServerless}
                      className={`w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isServerless ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {isServerless ? 'Set as CLAUDE_API_KEY environment variable' : 'Your Anthropic Claude API key'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default System Prompt
                    </label>
                    <textarea
                      value={defaultSystemPrompt}
                      onChange={(e) => setDefaultSystemPrompt(e.target.value)}
                      placeholder="Default system prompt for LLM annotation..."
                      readOnly={isServerless}
                      className={`w-full h-24 p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isServerless ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {isServerless ? 'Set as DEFAULT_SYSTEM_PROMPT environment variable' : 'The default system prompt used for LLM annotation'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Machine Prompt
                    </label>
                    <textarea
                      value={defaultMachinePrompt}
                      onChange={(e) => setDefaultMachinePrompt(e.target.value)}
                      placeholder="Default machine prompt for LLM annotation..."
                      readOnly={isServerless}
                      className={`w-full h-24 p-3 border border-gray-300 rounded-md resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        isServerless ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {isServerless ? 'Set as DEFAULT_MACHINE_PROMPT environment variable' : 'The default machine prompt used for LLM annotation'}
                    </p>
                  </div>

                  {message && (
                    <div className={`p-3 rounded-md ${
                      message.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {message}
                    </div>
                  )}

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={handleCloseModal}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveSettings}
                      disabled={saving || isServerless}
                      className={`px-4 py-2 text-white rounded-md transition ${
                        isServerless 
                          ? 'bg-gray-400 cursor-not-allowed' 
                          : 'bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300'
                      }`}
                    >
                      {saving ? 'Saving...' : isServerless ? 'Cannot Save (Deployed)' : 'Save Settings'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
} 