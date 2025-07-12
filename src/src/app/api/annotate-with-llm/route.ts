import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

interface FeatureDefinition {
  Code: string;
  Definition: string;
  Example1?: string;
  Example2?: string;
  NonExample1?: string;
  NonExample2?: string;
}

interface LLMAnnotationRequest {
  transcriptId: string;
  llmProvider: 'openai' | 'claude';
  systemPrompt?: string;
  machinePrompt?: string;
  startLineOffset?: number;
  featureDefinitions: {
    categories: string[];
    features: {
      [category: string]: FeatureDefinition[];
    };
  };
  transcriptData: Array<{
    lineNumber: number;
    speaker: string;
    utterance: string;
  }>;
}

interface LLMAnnotationResponse {
  success: boolean;
  annotations?: Record<string, Record<string, Record<string, boolean>>>;
  error?: string;
}

// Helper function to detect if we're running in a serverless environment
function isServerlessEnvironment(): boolean {
  return !!process.env.VERCEL || !!process.env.LAMBDA_TASK_ROOT || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  machinePrompt: string,
  featureDefinitions: LLMAnnotationRequest['featureDefinitions'],
  transcriptData: LLMAnnotationRequest['transcriptData'],
  startLineOffset: number = 0
): Promise<Record<string, Record<string, Record<string, boolean>>>> {
  const client = new OpenAI({ apiKey });

  // Format the feature definitions for the prompt
  const featureList = Object.entries(featureDefinitions.features)
    .map(([category, features]) => {
      const featureCodes = features.map((f) => f.Code).join(', ');
      return `${category}: ${featureCodes}`;
    })
    .join('\n');

  // Process in batches to avoid token limits
  const BATCH_SIZE = 20; // Process 20 lines at a time
  const allAnnotations: Record<string, Record<string, Record<string, boolean>>> = {};

  // Initialize the structure
  for (const category of featureDefinitions.categories) {
    allAnnotations[category] = {};
  }

  // Process transcript in batches
  for (let i = 0; i < transcriptData.length; i += BATCH_SIZE) {
    const batch = transcriptData.slice(i, i + BATCH_SIZE);
    const batchStartLine = startLineOffset + i + 1;
    
    // Format the batch data
    const batchText = batch
      .map((line, index) => `${batchStartLine + index}. ${line.speaker}: ${line.utterance}`)
      .join('\n');

    const prompt = `${machinePrompt}

Available features:
${featureList}

Transcript lines ${batchStartLine} to ${batchStartLine + batch.length - 1}:
${batchText}

Please analyze each line and return a JSON object with the following structure:
{
  "annotations": {
    "category_name": {
      "line_number": {
        "feature_code": true/false
      }
    }
  }
}

For example:
{
  "annotations": {
    "Conceptual": {
      "${batchStartLine}": {
        "C.1": true,
        "C.2": false
      },
      "${batchStartLine + 1}": {
        "C.1": false,
        "C.2": true
      }
    }
  }
}

IMPORTANT: Only analyze lines ${batchStartLine} to ${batchStartLine + batch.length - 1}. Use the exact line numbers shown.`;

    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error(`No response from OpenAI for batch starting at line ${batchStartLine}`);
      }

      // Try to parse the JSON response
      let batchAnnotations;
      try {
        const parsed = JSON.parse(response);
        batchAnnotations = parsed.annotations || parsed;
      } catch {
        // If JSON parsing fails, try to extract JSON from the response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          batchAnnotations = JSON.parse(jsonMatch[0]).annotations || JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(`Invalid JSON response from OpenAI for batch starting at line ${batchStartLine}`);
        }
      }

      // Merge batch annotations into all annotations
      for (const category of featureDefinitions.categories) {
        if (batchAnnotations[category]) {
          for (const lineNumber in batchAnnotations[category]) {
            allAnnotations[category][lineNumber] = batchAnnotations[category][lineNumber];
          }
        }
      }

      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`OpenAI API error for batch starting at line ${batchStartLine}:`, error);
      // Continue with the next batch instead of failing completely
      continue;
    }
  }

  return allAnnotations;
}

async function callClaude(
  apiKey: string,
  systemPrompt: string,
  machinePrompt: string,
  featureDefinitions: LLMAnnotationRequest['featureDefinitions'],
  transcriptData: LLMAnnotationRequest['transcriptData'],
  startLineOffset: number = 0
): Promise<Record<string, Record<string, Record<string, boolean>>>> {
  const client = new Anthropic({ apiKey });

  // Format the feature definitions for the prompt
  const featureList = Object.entries(featureDefinitions.features)
    .map(([category, features]) => {
      const featureCodes = features.map((f) => f.Code).join(', ');
      return `${category}: ${featureCodes}`;
    })
    .join('\n');

  // Process in batches to avoid token limits
  const BATCH_SIZE = 25; // Claude can handle slightly larger batches
  const allAnnotations: Record<string, Record<string, Record<string, boolean>>> = {};

  // Initialize the structure
  for (const category of featureDefinitions.categories) {
    allAnnotations[category] = {};
  }

  // Process transcript in batches
  for (let i = 0; i < transcriptData.length; i += BATCH_SIZE) {
    const batch = transcriptData.slice(i, i + BATCH_SIZE);
    const batchStartLine = startLineOffset + i + 1;
    
    // Format the batch data
    const batchText = batch
      .map((line, index) => `${batchStartLine + index}. ${line.speaker}: ${line.utterance}`)
      .join('\n');

    const prompt = `${machinePrompt}

Available features:
${featureList}

Transcript lines ${batchStartLine} to ${batchStartLine + batch.length - 1}:
${batchText}

Please analyze each line and return a JSON object with the following structure:
{
  "annotations": {
    "category_name": {
      "line_number": {
        "feature_code": true/false
      }
    }
  }
}

For example:
{
  "annotations": {
    "Conceptual": {
      "${batchStartLine}": {
        "C.1": true,
        "C.2": false
      },
      "${batchStartLine + 1}": {
        "C.1": false,
        "C.2": true
      }
    }
  }
}

IMPORTANT: Only analyze lines ${batchStartLine} to ${batchStartLine + batch.length - 1}. Use the exact line numbers shown.`;

    try {
      const message = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2000,
        temperature: 0.1,
        system: systemPrompt,
        messages: [
          { role: "user", content: prompt }
        ]
      });

      const response = message.content[0];
      if (response.type !== 'text') {
        throw new Error(`Unexpected response type from Claude for batch starting at line ${batchStartLine}`);
      }

      // Try to parse the JSON response
      let batchAnnotations;
      try {
        const parsed = JSON.parse(response.text);
        batchAnnotations = parsed.annotations || parsed;
      } catch {
        // If JSON parsing fails, try to extract JSON from the response
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          batchAnnotations = JSON.parse(jsonMatch[0]).annotations || JSON.parse(jsonMatch[0]);
        } else {
          throw new Error(`Invalid JSON response from Claude for batch starting at line ${batchStartLine}`);
        }
      }

      // Merge batch annotations into all annotations
      for (const category of featureDefinitions.categories) {
        if (batchAnnotations[category]) {
          for (const lineNumber in batchAnnotations[category]) {
            allAnnotations[category][lineNumber] = batchAnnotations[category][lineNumber];
          }
        }
      }

      // Add a small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`Claude API error for batch starting at line ${batchStartLine}:`, error);
      // Continue with the next batch instead of failing completely
      continue;
    }
  }

  return allAnnotations;
}

export async function POST(request: NextRequest): Promise<NextResponse<LLMAnnotationResponse>> {
  try {
    const body: LLMAnnotationRequest = await request.json();
    const { llmProvider, systemPrompt, machinePrompt, featureDefinitions, transcriptData, startLineOffset } = body;

    // Load settings - prioritize process.env, then fall back to .env.local in non-serverless environments
    const settings: Record<string, string> = {};
    
    // First, read from process.env (works in all environments)
    settings.OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
    settings.CLAUDE_API_KEY = process.env.CLAUDE_API_KEY || '';
    settings.DEFAULT_SYSTEM_PROMPT = process.env.DEFAULT_SYSTEM_PROMPT || '';
    settings.DEFAULT_MACHINE_PROMPT = process.env.DEFAULT_MACHINE_PROMPT || '';
    
    // If we're not in a serverless environment, also try to read from .env.local
    if (!isServerlessEnvironment()) {
      const settingsPath = path.join(process.cwd(), '.env.local');
      
      if (fs.existsSync(settingsPath)) {
        const envContent = fs.readFileSync(settingsPath, 'utf-8');
        
        // Handle multi-line values by processing the entire content
        let currentKey = '';
        let currentValue = '';
        let insideQuotes = false;
        
        const lines = envContent.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          if (!line || line.startsWith('#')) continue;
          
          if (!insideQuotes && line.includes('=')) {
            // Save previous key-value if exists
            if (currentKey && currentValue) {
              // Remove surrounding quotes and clean up, removing any newlines
              let cleanValue = currentValue.trim().replace(/\n/g, '');
              if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) || 
                  (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
                cleanValue = cleanValue.slice(1, -1);
              }
              
              // Only set if not already set from process.env
              if (!settings[currentKey]) {
                settings[currentKey] = cleanValue;
              }
            }
            
            // Start new key-value pair
            const equalIndex = line.indexOf('=');
            currentKey = line.substring(0, equalIndex).trim();
            const valueStart = line.substring(equalIndex + 1).trim();
            
            if (valueStart.startsWith('"') && !valueStart.endsWith('"')) {
              // Multi-line value starting
              insideQuotes = true;
              currentValue = valueStart;
            } else {
              // Single line value
              currentValue = valueStart;
              insideQuotes = false;
            }
          } else if (insideQuotes) {
            // Continue multi-line value (join without newlines for API keys)
            currentValue += line;
            if (line.endsWith('"')) {
              insideQuotes = false;
            }
          }
        }
        
        // Handle the last key-value pair
        if (currentKey && currentValue) {
          let cleanValue = currentValue.trim().replace(/\n/g, '');
          if ((cleanValue.startsWith('"') && cleanValue.endsWith('"')) || 
              (cleanValue.startsWith("'") && cleanValue.endsWith("'"))) {
            cleanValue = cleanValue.slice(1, -1);
          }
          
          // Only set if not already set from process.env
          if (!settings[currentKey]) {
            settings[currentKey] = cleanValue;
          }
        }
      }
    }

    // Get API key based on provider
    let apiKey: string;
    if (llmProvider === 'openai') {
      apiKey = settings.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          error: 'OpenAI API key not configured. Please set it in the settings or environment variables.'
        }, { status: 400 });
      }
    } else if (llmProvider === 'claude') {
      apiKey = settings.CLAUDE_API_KEY;
      if (!apiKey) {
        return NextResponse.json({
          success: false,
          error: 'Claude API key not configured. Please set it in the settings or environment variables.'
        }, { status: 400 });
      }
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid LLM provider. Must be "openai" or "claude".'
      }, { status: 400 });
    }

    // Use default prompts if not provided
    const finalSystemPrompt = systemPrompt || settings.DEFAULT_SYSTEM_PROMPT || 'You are an expert educational researcher analyzing classroom transcripts. Your task is to identify specific educational features in the dialogue.';
    const finalMachinePrompt = machinePrompt || settings.DEFAULT_MACHINE_PROMPT || 'Please analyze the following classroom transcript and identify which educational features are present in each line. For each line, indicate whether each feature is present (true) or absent (false).';

    // Call the appropriate LLM API
    let annotations: Record<string, Record<string, Record<string, boolean>>>;
    if (llmProvider === 'openai') {
      annotations = await callOpenAI(apiKey, finalSystemPrompt, finalMachinePrompt, featureDefinitions, transcriptData, startLineOffset || 0);
    } else {
      annotations = await callClaude(apiKey, finalSystemPrompt, finalMachinePrompt, featureDefinitions, transcriptData, startLineOffset || 0);
    }

    // Validate and format the response
    const formattedAnnotations: Record<string, Record<string, Record<string, boolean>>> = {};
    
    for (const category of featureDefinitions.categories) {
      formattedAnnotations[category] = {};
      
      for (let i = 0; i < transcriptData.length; i++) {
        const actualLineNumber = (startLineOffset || 0) + i + 1;
        formattedAnnotations[category][actualLineNumber] = {};
        
        const categoryFeatures = featureDefinitions.features[category] || [];
        for (const feature of categoryFeatures) {
          // Try to get the annotation value, defaulting to false if not found
          const annotationValue = annotations?.[category]?.[actualLineNumber]?.[feature.Code] ?? false;
          formattedAnnotations[category][actualLineNumber][feature.Code] = Boolean(annotationValue);
        }
      }
    }

    return NextResponse.json({
      success: true,
      annotations: formattedAnnotations
    });

  } catch (error) {
    console.error('LLM annotation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
} 