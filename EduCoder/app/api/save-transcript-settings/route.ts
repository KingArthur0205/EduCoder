import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper function to detect if we're running in a serverless environment
function isServerlessEnvironment(): boolean {
  return !!process.env.VERCEL || !!process.env.LAMBDA_TASK_ROOT || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

export async function POST(request: NextRequest) {
  try {
    const { transcriptId, gradeLevel, lessonGoal, title, instruction } = await request.json();
    
    // Use new field names if provided, fallback to old ones for compatibility
    const finalTitle = title || gradeLevel;
    const finalInstruction = instruction || lessonGoal;
    
    if (!transcriptId) {
      return NextResponse.json({
        success: false,
        error: 'Transcript ID is required'
      }, { status: 400 });
    }
    
    // If we're in a serverless environment, we can't write to .env.local
    if (isServerlessEnvironment()) {
      return NextResponse.json({
        success: false,
        error: 'Settings cannot be saved in the deployed environment. Transcript metadata will only be stored in localStorage.',
        isServerless: true
      }, { status: 400 });
    }

    const envPath = path.join(process.cwd(), '.env.local');
    
    // Read existing .env.local file if it exists
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }
    
    // Parse existing environment variables
    const envLines = envContent.split('\n');
    const envVars: { [key: string]: string } = {};
    
    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=');
        if (key && valueParts.length > 0) {
          envVars[key.trim()] = valueParts.join('=').trim();
        }
      }
    });
    
    // Update or add transcript-specific settings with proper prefixing
    const transcriptPrefix = `TRANSCRIPT_${transcriptId.toUpperCase()}`;
    
    if (finalTitle !== undefined) {
      const key = `${transcriptPrefix}_TITLE`;
      envVars[key] = `"${finalTitle.replace(/"/g, '\\"')}"`;
      // Also save under old key for backward compatibility
      const oldKey = `${transcriptPrefix}_GRADE_LEVEL`;
      envVars[oldKey] = `"${finalTitle.replace(/"/g, '\\"')}"`;
    }
    
    if (finalInstruction !== undefined) {
      const key = `${transcriptPrefix}_INSTRUCTION`;
      envVars[key] = `"${finalInstruction.replace(/"/g, '\\"')}"`;
      // Also save under old key for backward compatibility
      const oldKey = `${transcriptPrefix}_LESSON_GOAL`;
      envVars[oldKey] = `"${finalInstruction.replace(/"/g, '\\"')}"`;
    }
    
    // Add a timestamp for when this was last updated
    const timestampKey = `${transcriptPrefix}_LAST_UPDATED`;
    envVars[timestampKey] = `"${new Date().toISOString()}"`;
    
    // Reconstruct the .env.local file content
    const newEnvContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Write the updated content back to .env.local
    fs.writeFileSync(envPath, newEnvContent, 'utf8');
    
    return NextResponse.json({
      success: true,
      message: `Transcript ${transcriptId} metadata saved to local settings file`
    });
  } catch (error) {
    console.error('Error saving transcript settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save transcript settings' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('transcriptId');
    
    if (!transcriptId) {
      return NextResponse.json({
        success: false,
        error: 'Transcript ID is required'
      }, { status: 400 });
    }
    
    const transcriptPrefix = `TRANSCRIPT_${transcriptId.toUpperCase()}`;
    const settings = {
      title: '',
      instruction: '',
      gradeLevel: '', // Keep for backward compatibility
      lessonGoal: '', // Keep for backward compatibility
      lastUpdated: ''
    };
    
    // First, try to read from process.env (works in both environments)
    // Try new field names first, then fallback to old ones
    settings.title = process.env[`${transcriptPrefix}_TITLE`] || process.env[`${transcriptPrefix}_GRADE_LEVEL`] || '';
    settings.instruction = process.env[`${transcriptPrefix}_INSTRUCTION`] || process.env[`${transcriptPrefix}_LESSON_GOAL`] || '';
    settings.gradeLevel = settings.title; // For backward compatibility
    settings.lessonGoal = settings.instruction; // For backward compatibility
    settings.lastUpdated = process.env[`${transcriptPrefix}_LAST_UPDATED`] || '';
    
    // If we're not in a serverless environment, also try to read from .env.local
    if (!isServerlessEnvironment()) {
      const envPath = path.join(process.cwd(), '.env.local');
      
      if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const envLines = envContent.split('\n');
        
        envLines.forEach(line => {
          const trimmedLine = line.trim();
          if (trimmedLine && !trimmedLine.startsWith('#')) {
            const [key, ...valueParts] = trimmedLine.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
              const keyTrimmed = key.trim();
              
              // Only override if the process.env value is empty
              if (keyTrimmed === `${transcriptPrefix}_TITLE` && !settings.title) {
                settings.title = value;
                settings.gradeLevel = value; // For backward compatibility
              } else if (keyTrimmed === `${transcriptPrefix}_INSTRUCTION` && !settings.instruction) {
                settings.instruction = value;
                settings.lessonGoal = value; // For backward compatibility
              } else if (keyTrimmed === `${transcriptPrefix}_GRADE_LEVEL` && !settings.title) {
                settings.title = value;
                settings.gradeLevel = value;
              } else if (keyTrimmed === `${transcriptPrefix}_LESSON_GOAL` && !settings.instruction) {
                settings.instruction = value;
                settings.lessonGoal = value;
              } else if (keyTrimmed === `${transcriptPrefix}_LAST_UPDATED` && !settings.lastUpdated) {
                settings.lastUpdated = value;
              }
            }
          }
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      transcriptId,
      settings,
      isServerless: isServerlessEnvironment()
    });
  } catch (error) {
    console.error('Error reading transcript settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read transcript settings' },
      { status: 500 }
    );
  }
}