import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const url = new URL(request.url);
    const file = url.searchParams.get('file');

    if (!file) {
      return NextResponse.json(
        { error: 'File parameter is required' },
        { status: 400 }
      );
    }

    // First, try to serve from public folder if file exists
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const filePath = path.join(process.cwd(), 'public', id, file);
      
      if (fs.existsSync(filePath)) {
        let contentType = 'text/csv';
        
        // Determine content type based on file extension
        if (file.endsWith('.json')) {
          contentType = 'application/json';
        } else if (file.endsWith('.xlsx')) {
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        } else if (file.endsWith('.txt')) {
          contentType = 'text/plain';
        }
        
        if (file.endsWith('.xlsx')) {
          // For binary files, return as buffer
          const buffer = fs.readFileSync(filePath);
          return new NextResponse(buffer, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Content-Disposition': `attachment; filename="${file}"`
            }
          });
        } else {
          // For text files, return as string
          const fileContent = fs.readFileSync(filePath, 'utf8');
          
          // Disable caching for content.json files to ensure real-time updates
          const cacheControl = file === 'content.json' ? 'no-cache, no-store, must-revalidate' : 'public, max-age=300';
          
          return new NextResponse(fileContent, {
            status: 200,
            headers: {
              'Content-Type': contentType,
              'Cache-Control': cacheControl
            }
          });
        }
      }
    } catch (error) {
      console.log(`File ${file} not found in public folder for ${id}:`, error);
    }

    // If file doesn't exist in public folder, return localStorage message
    return NextResponse.json({
      error: 'Local storage mode - files should be loaded from browser localStorage',
      useLocalStorage: true,
      transcriptId: id,
      filename: file,
      localStorageKey: `${id}-${file}`
    }, { status: 404 });

  } catch (error) {
    console.error('Error in transcript API:', error);
    return NextResponse.json(
      { error: 'Failed to load transcript file' },
      { status: 500 }
    );
  }
} 