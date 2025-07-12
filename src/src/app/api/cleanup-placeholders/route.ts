import { NextResponse } from 'next/server';
import { readdir, readFile, writeFile, unlink, stat } from 'fs/promises';
import { join } from 'path';

export async function POST() {
  console.log('=== Cleanup placeholders request received ===');
  
  try {
    let totalCleaned = 0;
    const publicDir = join(process.cwd(), 'public');
    
    // Get all transcript directories
    const entries = await readdir(publicDir, { withFileTypes: true });
    const transcriptDirs = entries
      .filter(entry => entry.isDirectory() && entry.name.startsWith('t'))
      .map(entry => entry.name);
    
    console.log('Found transcript directories:', transcriptDirs);
    
    for (const transcriptId of transcriptDirs) {
      const transcriptDir = join(publicDir, transcriptId);
      const imagesDir = join(transcriptDir, 'images');
      const imagesJsonPath = join(transcriptDir, 'images.json');
      
      try {
        // Check if images directory exists
        const imagesExists = await stat(imagesDir).then(() => true).catch(() => false);
        if (!imagesExists) continue;
        
        // Get all image files in the images directory
        const imageFiles = await readdir(imagesDir);
        
        for (const imageFile of imageFiles) {
          const imagePath = join(imagesDir, imageFile);
          const fileStats = await stat(imagePath);
          
          // If file is less than 100 bytes, it's likely a placeholder
          if (fileStats.size < 100) {
            console.log(`Deleting placeholder: ${imagePath} (${fileStats.size} bytes)`);
            await unlink(imagePath);
            totalCleaned++;
          }
        }
        
        // Update images.json to remove references to deleted files
        if (await stat(imagesJsonPath).then(() => true).catch(() => false)) {
          const imagesData = JSON.parse(await readFile(imagesJsonPath, 'utf-8'));
          
          if (imagesData.images && Array.isArray(imagesData.images)) {
            // Check which images still exist
            const validImages = [];
            for (const img of imagesData.images) {
              const imgPath = join(publicDir, img.url.substring(1)); // Remove leading /
              const exists = await stat(imgPath).then(() => true).catch(() => false);
              if (exists) {
                validImages.push(img);
              }
            }
            
            if (validImages.length !== imagesData.images.length) {
              imagesData.images = validImages;
              await writeFile(imagesJsonPath, JSON.stringify(imagesData, null, 2));
              console.log(`Updated ${transcriptId}/images.json`);
            }
          }
        }
        
      } catch (error) {
        console.error(`Error processing ${transcriptId}:`, error);
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      cleaned: totalCleaned,
      message: `Successfully cleaned up ${totalCleaned} placeholder image(s)`
    });

  } catch (error) {
    console.error('=== Error cleaning up placeholders ===');
    console.error('Error details:', error);
    return NextResponse.json({ 
      error: `Failed to cleanup placeholders: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
} 