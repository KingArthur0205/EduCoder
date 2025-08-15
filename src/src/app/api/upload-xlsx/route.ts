import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Get the form data from the request
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const transcriptNumber = formData.get('transcriptNumber') as string;

    if (!file) {
      return NextResponse.json({ message: 'No file provided' }, { status: 400 });
    }

    if (!transcriptNumber) {
      return NextResponse.json({ message: 'No transcript number provided' }, { status: 400 });
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create a unique filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const fileName = `${transcriptNumber}_annotations_${timestamp}.xlsx`;

    console.log('Processing XLSX file for local storage:', {
      fileName,
      fileSize: buffer.length,
      transcriptNumber
    });

    // Return file data for client-side storage instead of uploading to cloud
    return NextResponse.json({ 
      message: 'XLSX file processed successfully for local storage!',
      fileName: fileName,
      fileSize: buffer.length,
      transcriptNumber: transcriptNumber,
      fileData: buffer.toString('base64'), // Return file data for local storage
      uploadedAt: new Date().toISOString(),
      storage: 'local'
    });
  } 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch (error: any) {
    console.error('Error processing XLSX file:', error);
    return NextResponse.json({ 
      message: `Error processing XLSX file: ${error?.message || 'Unknown error'}` 
    }, { status: 500 });
  }
} 