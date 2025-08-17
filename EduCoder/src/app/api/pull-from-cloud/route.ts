import { NextRequest, NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';

interface CloudFile {
  fileName: string;
  userId: string;
  content: ArrayBuffer;
  uploadedAt?: string;
  size?: number;
}

let storage: Storage | null = null;

// Initialize Google Cloud Storage
function initializeStorage() {
  if (!storage) {
    try {
      const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64 || '', 'base64').toString();
      const credentials = JSON.parse(credentialsJson);
      
      storage = new Storage({
        credentials,
        projectId: credentials.project_id
      });
      
      console.log('Google Cloud Storage initialized successfully for project:', credentials.project_id);
    } catch (error) {
      console.error('Failed to initialize Google Cloud Storage:', error);
      throw new Error('Google Cloud Storage initialization failed');
    }
  }
  return storage;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('transcriptId');
    
    if (!transcriptId) {
      return NextResponse.json({ error: 'Transcript ID is required' }, { status: 400 });
    }
    
    const gcs = initializeStorage();
    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'mol_summit';
    const bucket = gcs.bucket(bucketName);
    
    // List all files that match the annotation pattern for this transcript
    const [files] = await bucket.getFiles({
      prefix: 'users/'
    });
    
    const matchingFiles: CloudFile[] = [];
    
    for (const file of files) {
      // Check if this file is an annotation file for the specific transcript
      const fileName = file.name;
      
      // Look for files that match pattern: users/{userId}/transcript_{transcriptId}_annotations*.xlsx
      const pattern = new RegExp(`users/([^/]+)/transcript_${transcriptId}_annotations.*\\.xlsx$`);
      const match = fileName.match(pattern);
      
      if (match) {
        try {
          const userId = match[1];
          const [fileContent] = await file.download();
          const [metadata] = await file.getMetadata();
          
          matchingFiles.push({
            fileName: file.name.split('/').pop() || '', // Just the filename
            userId: userId,
            content: fileContent.buffer as ArrayBuffer,
            uploadedAt: metadata.timeCreated,
            size: typeof metadata.size === 'number' ? metadata.size : 0
          });
        } catch (downloadError) {
          console.error(`Error downloading file ${fileName}:`, downloadError);
        }
      }
    }
    
    if (matchingFiles.length === 0) {
      return NextResponse.json({ 
        files: [], 
        groupedFiles: {},
        message: `No annotation files found for transcript ${transcriptId}` 
      });
    }
    
    // Group files by user ID
    const groupedFiles: Record<string, Array<{
      fileName: string;
      uploadedAt?: string;
      size?: number;
    }>> = {};
    matchingFiles.forEach(file => {
      if (!groupedFiles[file.userId]) {
        groupedFiles[file.userId] = [];
      }
      groupedFiles[file.userId].push({
        fileName: file.fileName,
        uploadedAt: file.uploadedAt,
        size: file.size
      });
    });

    // Convert ArrayBuffer to Array for JSON serialization
    const filesForResponse = matchingFiles.map(file => ({
      fileName: file.fileName,
      userId: file.userId,
      uploadedAt: file.uploadedAt,
      size: file.size,
      content: Array.from(new Uint8Array(file.content))
    }));
    
    return NextResponse.json({ 
      files: filesForResponse,
      groupedFiles,
      message: `Found ${matchingFiles.length} annotation file(s) for transcript ${transcriptId}`
    });
    
  } catch (error) {
    console.error('Error pulling files from cloud:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to pull files from cloud storage' },
      { status: 500 }
    );
  }
}

// POST endpoint to download a specific file
export async function POST(request: NextRequest) {
  try {
    const { transcriptId, userId } = await request.json();
    
    if (!transcriptId || !userId) {
      return NextResponse.json(
        { error: 'Transcript ID and User ID are required' },
        { status: 400 }
      );
    }

    const gcs = initializeStorage();
    const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'mol_summit';
    const bucket = gcs.bucket(bucketName);
    
    // Look for annotation files for this user and transcript
    const [files] = await bucket.getFiles({
      prefix: `users/${userId}/transcript_${transcriptId}_annotations`
    });

    if (files.length === 0) {
      return NextResponse.json(
        { error: `No annotations found for transcript ${transcriptId} by user ${userId}` },
        { status: 404 }
      );
    }

    // Get the most recent file (assuming timestamp in filename)
    const latestFile = files.sort((a, b) => {
      // Extract timestamp from filename and compare
      const aTime = a.name.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || '';
      const bTime = b.name.match(/(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})/)?.[1] || '';
      return bTime.localeCompare(aTime);
    })[0];

    // Download the file content
    const [fileContent] = await latestFile.download();
    
    // Get file metadata
    const [metadata] = await latestFile.getMetadata();
    
    return NextResponse.json({
      success: true,
      fileName: latestFile.name,
      fileSize: metadata.size,
      uploadedAt: metadata.timeCreated,
      content: Array.from(new Uint8Array(fileContent.buffer)) // Convert to array for JSON
    });

  } catch (error) {
    console.error('Error downloading transcript from cloud:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to download transcript from cloud storage' 
      },
      { status: 500 }
    );
  }
}