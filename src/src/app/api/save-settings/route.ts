import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Helper function to detect if we're running in a serverless environment
function isServerlessEnvironment(): boolean {
  return !!process.env.VERCEL || !!process.env.LAMBDA_TASK_ROOT || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      googleCredentialsBase64, 
      googleCloudBucketName,
      openaiApiKey,
      claudeApiKey,
      defaultSystemPrompt,
      defaultMachinePrompt
    } = await request.json();
    
    // If we're in a serverless environment (like Vercel), we can't write to .env.local
    if (isServerlessEnvironment()) {
      return NextResponse.json({
        success: false,
        error: 'Settings cannot be saved in the deployed environment. Please set the environment variables through your hosting provider\'s dashboard (e.g., Vercel Environment Variables).',
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
    
    // Update or add the Google credentials and bucket name
    if (googleCredentialsBase64 !== undefined) {
      envVars['GOOGLE_CREDENTIALS_BASE64'] = `"${googleCredentialsBase64}"`;
    }
    if (googleCloudBucketName !== undefined) {
      envVars['GOOGLE_CLOUD_BUCKET_NAME'] = `"${googleCloudBucketName}"`;
    }
    
    // Update or add LLM API keys
    if (openaiApiKey !== undefined) {
      envVars['OPENAI_API_KEY'] = `"${openaiApiKey}"`;
    }
    if (claudeApiKey !== undefined) {
      envVars['CLAUDE_API_KEY'] = `"${claudeApiKey}"`;
    }
    
    // Update or add default prompts
    if (defaultSystemPrompt !== undefined) {
      envVars['DEFAULT_SYSTEM_PROMPT'] = `"${defaultSystemPrompt.replace(/"/g, '\\"')}"`;
    }
    if (defaultMachinePrompt !== undefined) {
      envVars['DEFAULT_MACHINE_PROMPT'] = `"${defaultMachinePrompt.replace(/"/g, '\\"')}"`;
    }
    
    // Reconstruct the .env.local file content
    const newEnvContent = Object.entries(envVars)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    // Write the updated content back to .env.local
    fs.writeFileSync(envPath, newEnvContent, 'utf8');
    
    return NextResponse.json({
      success: true,
      message: 'Settings saved successfully'
    });
  } catch (error) {
    console.error('Error saving settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const settings = {
      googleCredentialsBase64: '',
      googleCloudBucketName: '',
      openaiApiKey: '',
      claudeApiKey: '',
      defaultSystemPrompt: '',
      defaultMachinePrompt: ''
    };
    
    // First, try to read from process.env (works in both environments)
    settings.googleCredentialsBase64 = process.env.GOOGLE_CREDENTIALS_BASE64 || '';
    settings.googleCloudBucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || '';
    settings.openaiApiKey = process.env.OPENAI_API_KEY || '';
    settings.claudeApiKey = process.env.CLAUDE_API_KEY || '';
    settings.defaultSystemPrompt = process.env.DEFAULT_SYSTEM_PROMPT || '';
    settings.defaultMachinePrompt = process.env.DEFAULT_MACHINE_PROMPT || '';
    
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
              
              // Only override if the process.env value is empty (local .env.local takes precedence)
              if (keyTrimmed === 'GOOGLE_CREDENTIALS_BASE64' && !settings.googleCredentialsBase64) {
                settings.googleCredentialsBase64 = value;
              } else if (keyTrimmed === 'GOOGLE_CLOUD_BUCKET_NAME' && !settings.googleCloudBucketName) {
                settings.googleCloudBucketName = value;
              } else if (keyTrimmed === 'OPENAI_API_KEY' && !settings.openaiApiKey) {
                settings.openaiApiKey = value;
              } else if (keyTrimmed === 'CLAUDE_API_KEY' && !settings.claudeApiKey) {
                settings.claudeApiKey = value;
              } else if (keyTrimmed === 'DEFAULT_SYSTEM_PROMPT' && !settings.defaultSystemPrompt) {
                settings.defaultSystemPrompt = value;
              } else if (keyTrimmed === 'DEFAULT_MACHINE_PROMPT' && !settings.defaultMachinePrompt) {
                settings.defaultMachinePrompt = value;
              }
            }
          }
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      settings,
      isServerless: isServerlessEnvironment()
    });
  } catch (error) {
    console.error('Error reading settings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to read settings' },
      { status: 500 }
    );
  }
} 