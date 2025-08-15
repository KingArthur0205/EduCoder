import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

// Create a Storage instance with explicit credentials
let storage: Storage;
try {
  // Decode the Base64-encoded credentials from the environment variable
  const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64 || '', 'base64').toString();
  const credentials = JSON.parse(credentialsJson);
  
  storage = new Storage({
    credentials,
    projectId: credentials.project_id
  });
  console.log('Google Cloud Storage initialized successfully for project:', credentials.project_id);
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error);
}

// Specify the name of your bucket
const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'mol_summit';

export async function POST(request: NextRequest) {
  try {
    const { transcriptId, userId } = await request.json();
    
    if (!transcriptId) {
      return NextResponse.json(
        { success: false, error: 'Transcript ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'User ID is required' },
        { status: 400 }
      );
    }

    // Validate userId format
    if (!/^[a-zA-Z0-9_-]+$/.test(userId) || userId.length < 3 || userId.length > 20) {
      return NextResponse.json(
        { success: false, error: 'Invalid User ID format' },
        { status: 400 }
      );
    }

    if (!storage) {
      return NextResponse.json(
        { success: false, error: 'Google Cloud Storage not configured. Please set up credentials in settings.' },
        { status: 400 }
      );
    }

    // Check if transcript directory exists
    const transcriptDir = path.join(process.cwd(), 'public', transcriptId);
    if (!fs.existsSync(transcriptDir)) {
      return NextResponse.json(
        { success: false, error: 'Transcript not found' },
        { status: 404 }
      );
    }

    const bucket = storage.bucket(bucketName);

    // Create a temporary zip file
    const tempZipPath = path.join(process.cwd(), 'temp', `${transcriptId}.zip`);
    
    // Ensure temp directory exists
    const tempDir = path.dirname(tempZipPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create zip archive
    const output = fs.createWriteStream(tempZipPath);
    const archive = archiver('zip', {
      zlib: { level: 9 } // Maximum compression
    });

    // Handle archive events
    let archiveError: Error | null = null;
    
    archive.on('error', (err) => {
      archiveError = err;
    });

    archive.pipe(output);

    // Add all files from transcript directory to zip
    const addDirectoryToZip = (dirPath: string, zipPath: string = '') => {
      const items = fs.readdirSync(dirPath);
      
      for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        const relativePath = zipPath ? path.join(zipPath, item) : item;
        
        if (stat.isDirectory()) {
          addDirectoryToZip(fullPath, relativePath);
        } else {
          archive.file(fullPath, { name: relativePath });
        }
      }
    };

    addDirectoryToZip(transcriptDir);

    // Finalize the archive
    await archive.finalize();

    // Wait for the archive to be written
    await new Promise<void>((resolve, reject) => {
      output.on('close', () => resolve());
      output.on('error', reject);
    });

    if (archiveError) {
      throw archiveError;
    }

    // Upload zip file to Google Cloud Storage with user organization
    const fileName = `users/${userId}/transcripts/${transcriptId}/${transcriptId}_${new Date().toISOString().split('T')[0]}.zip`;
    
    await bucket.upload(tempZipPath, {
      destination: fileName,
      metadata: {
        metadata: {
          transcriptId,
          userId,
          uploadedAt: new Date().toISOString(),
          contentType: 'application/zip'
        }
      }
    });

    // Clean up temporary file
    if (fs.existsSync(tempZipPath)) {
      fs.unlinkSync(tempZipPath);
    }

    // Get the file size for response
    const [metadata] = await bucket.file(fileName).getMetadata();
    const fileSize = parseInt(String(metadata.size || '0'));

    return NextResponse.json({
      success: true,
      message: 'Transcript uploaded successfully to Google Cloud Storage',
      fileName,
      fileSize: Math.round(fileSize / 1024) + ' KB',
      uploadedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error uploading transcript to cloud:', error);
    
    // Clean up temp file if it exists
    try {
      const body = await request.clone().json();
      const tempZipPath = path.join(process.cwd(), 'temp', `${body.transcriptId}.zip`);
      if (fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
      }
    } catch (cleanupError) {
      console.error('Error cleaning up temp file:', cleanupError);
    }

    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload transcript to cloud storage' 
      },
      { status: 500 }
    );
  }
} 