import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function DELETE(request: NextRequest) {
  try {
    const { transcriptId } = await request.json();
    
    if (!transcriptId) {
      return NextResponse.json(
        { success: false, error: 'Transcript ID is required' },
        { status: 400 }
      );
    }
    
    const transcriptDir = path.join(process.cwd(), 'public', transcriptId);
    
    // Check if the directory exists
    if (!fs.existsSync(transcriptDir)) {
      return NextResponse.json(
        { success: false, error: 'Transcript not found' },
        { status: 404 }
      );
    }
    
    // Recursively delete the transcript directory and all its contents
    fs.rmSync(transcriptDir, { recursive: true, force: true });
    
    return NextResponse.json({
      success: true,
      message: `Transcript ${transcriptId} deleted successfully`
    });
  } catch (error) {
    console.error('Error deleting transcript:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete transcript' },
      { status: 500 }
    );
  }
} 