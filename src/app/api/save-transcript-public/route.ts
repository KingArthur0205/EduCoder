import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { transcriptId, csvContent, speakersData, contentData, imagesData } = await request.json();

    if (!transcriptId) {
      return NextResponse.json({ error: 'Transcript ID is required' }, { status: 400 });
    }

    // Create the transcript directory in public folder
    const transcriptDir = join(process.cwd(), 'public', transcriptId);
    
    try {
      mkdirSync(transcriptDir, { recursive: true });
    } catch {
      // Directory might already exist, that's okay
    }

    // Save transcript files
    if (csvContent) {
      writeFileSync(join(transcriptDir, 'transcript.csv'), csvContent);
    }
    
    if (speakersData) {
      writeFileSync(join(transcriptDir, 'speakers.json'), JSON.stringify(speakersData, null, 2));
    }
    
    if (contentData) {
      writeFileSync(join(transcriptDir, 'content.json'), JSON.stringify(contentData, null, 2));
    }
    
    if (imagesData) {
      writeFileSync(join(transcriptDir, 'images.json'), JSON.stringify(imagesData, null, 2));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving transcript to public folder:', error);
    return NextResponse.json(
      { error: 'Failed to save transcript to public folder' },
      { status: 500 }
    );
  }
}