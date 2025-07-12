import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

export async function POST(request: NextRequest) {
  try {
    const { transcriptId, content } = await request.json();
    
    if (!transcriptId) {
      return NextResponse.json({ error: 'No transcript ID provided' }, { status: 400 });
    }

    if (!content) {
      return NextResponse.json({ error: 'No content provided' }, { status: 400 });
    }

    // Create content.json path
    const contentPath = join(process.cwd(), 'public', transcriptId, 'content.json');
    
    // Save the content
    await writeFile(contentPath, JSON.stringify(content, null, 2));
    
    return NextResponse.json({ 
      success: true, 
      message: 'Content updated successfully'
    });

  } catch (error) {
    console.error('Error updating content:', error);
    return NextResponse.json({ 
      error: 'Failed to update content' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const transcriptId = searchParams.get('transcriptId');
    
    if (!transcriptId) {
      return NextResponse.json({ error: 'No transcript ID provided' }, { status: 400 });
    }

    // Read content.json path
    const contentPath = join(process.cwd(), 'public', transcriptId, 'content.json');
    
    try {
      const content = await readFile(contentPath, 'utf-8');
      return NextResponse.json({ 
        success: true, 
        content: JSON.parse(content)
      });
    } catch {
      // Return default content if file doesn't exist
      const defaultContent = {
        "grade_level": "Grade Level",
        "lesson_title": "Lesson Title",
        "learning_goals": "Learning Goals",
        "materials": "Materials",
        "instructions": "Instructions"
      };
      return NextResponse.json({ 
        success: true, 
        content: defaultContent
      });
    }

  } catch (error) {
    console.error('Error reading content:', error);
    return NextResponse.json({ 
      error: 'Failed to read content' 
    }, { status: 500 });
  }
} 