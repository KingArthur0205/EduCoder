import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('transcriptId');

    if (!transcriptId) {
      return NextResponse.json({ error: 'Transcript ID is required' }, { status: 400 });
    }

    const transcriptDir = join(process.cwd(), 'public', transcriptId);

    // Check if transcript directory exists
    if (!existsSync(transcriptDir)) {
      return NextResponse.json({ error: 'Transcript not found' }, { status: 404 });
    }

    const result: Record<string, unknown> = {};

    // Load transcript files if they exist
    const csvPath = join(transcriptDir, 'transcript.csv');
    if (existsSync(csvPath)) {
      result.csvContent = readFileSync(csvPath, 'utf-8');
    }

    const speakersPath = join(transcriptDir, 'speakers.json');
    if (existsSync(speakersPath)) {
      result.speakersData = JSON.parse(readFileSync(speakersPath, 'utf-8'));
    }

    const contentPath = join(transcriptDir, 'content.json');
    if (existsSync(contentPath)) {
      result.contentData = JSON.parse(readFileSync(contentPath, 'utf-8'));
    }

    const imagesPath = join(transcriptDir, 'images.json');
    if (existsSync(imagesPath)) {
      result.imagesData = JSON.parse(readFileSync(imagesPath, 'utf-8'));
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error loading transcript from public folder:', error);
    return NextResponse.json(
      { error: 'Failed to load transcript from public folder' },
      { status: 500 }
    );
  }
}