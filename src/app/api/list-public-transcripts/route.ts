import { NextResponse } from 'next/server';
import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET() {
  try {
    const publicDir = join(process.cwd(), 'public');
    
    if (!existsSync(publicDir)) {
      return NextResponse.json({ transcriptIds: [] });
    }

    const entries = readdirSync(publicDir);
    const transcriptIds = entries.filter(entry => {
      const entryPath = join(publicDir, entry);
      try {
        // Check if it's a directory and starts with 't' (transcript pattern)
        if (statSync(entryPath).isDirectory() && entry.startsWith('t')) {
          // Verify it has transcript files
          const transcriptFile = join(entryPath, 'transcript.csv');
          return existsSync(transcriptFile);
        }
        return false;
      } catch {
        return false;
      }
    });

    return NextResponse.json({ transcriptIds });
  } catch (error) {
    console.error('Error listing public transcripts:', error);
    return NextResponse.json(
      { error: 'Failed to list public transcripts' },
      { status: 500 }
    );
  }
}