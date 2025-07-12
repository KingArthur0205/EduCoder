import { NextResponse } from 'next/server';
import { readdir } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public');
    
    // Get all transcript directories (folders starting with 't' followed by numbers)
    const entries = await readdir(publicDir, { withFileTypes: true });
    const transcriptDirs = entries
      .filter(entry => entry.isDirectory() && /^t\d+$/.test(entry.name))
      .map(entry => entry.name);
    
    // Generate localStorage keys that should be cleared
    const keysToDelete: string[] = [];
    
    for (const transcriptDir of transcriptDirs) {
      const transcriptNumber = transcriptDir.replace('t', '');
      
      // Add all annotation-related localStorage keys
      keysToDelete.push(
        `annotations-${transcriptNumber}`,
        `tableData-${transcriptNumber}`,
        `notes-${transcriptNumber}`,
        `nextNoteId-${transcriptNumber}`,
        `availableIds-${transcriptNumber}`
      );
    }
    
    return NextResponse.json({
      success: true,
      keysToDelete,
      message: `Found ${keysToDelete.length} localStorage keys to clear across ${transcriptDirs.length} transcripts`
    });
    
  } catch (error) {
    console.error('Error getting localStorage keys to clear:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get localStorage keys to clear'
    });
  }
} 