import { NextResponse } from 'next/server';

export async function GET() {
  try {
    let transcriptDirs: string[] = [];
    
    // Check for existing transcripts in public folder
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const publicDir = path.join(process.cwd(), 'public');
      
      // Read all directories in public folder
      const items = fs.readdirSync(publicDir, { withFileTypes: true });
      
      // Filter for directories that are transcripts (start with 't' and contain transcript files)
      transcriptDirs = items
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .filter(name => {
          // Check if directory name looks like a transcript (starts with 't' followed by numbers)
          if (!/^t\d+$/.test(name)) return false;
          
          // Check if directory contains transcript files
          const csvPath = path.join(publicDir, name, 'transcript.csv');
          const speakersPath = path.join(publicDir, name, 'speakers.json');
          
          const hasFiles = fs.existsSync(csvPath) && fs.existsSync(speakersPath);
          console.log(`Checking ${name}: transcript.csv=${fs.existsSync(csvPath)}, speakers.json=${fs.existsSync(speakersPath)}`);
          return hasFiles;
        });
      
      console.log(`Found ${transcriptDirs.length} transcripts in public folder:`, transcriptDirs);
    } catch (error) {
      console.log('Error reading public folder transcripts:', error);
    }

    // Convert to transcript info format
    const transcripts = transcriptDirs.map(id => {
      const isOriginal = ['t001', 't044', 't053', 't016', 't019'].includes(id);
      return {
        id,
        displayName: `Transcript ${id}`,
        isNew: !isOriginal
      };
    });

    // Sort transcripts by number
    transcripts.sort((a, b) => {
      const aNum = parseInt(a.id.replace('t', ''), 10);
      const bNum = parseInt(b.id.replace('t', ''), 10);
      return aNum - bNum;
    });
    
    return NextResponse.json({
      success: true,
      transcripts,
      source: 'public-folder',
      message: `Found ${transcripts.length} transcripts in public folder`
    });

  } catch (error) {
    console.error('Error in list transcripts API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to list transcripts',
      transcripts: []
    });
  }
} 