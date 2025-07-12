import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function DELETE(request: NextRequest) {
  try {
    const { transcriptId, filename, imageIndex } = await request.json();
    
    if (!transcriptId) {
      return NextResponse.json(
        { success: false, error: 'Transcript ID is required' },
        { status: 400 }
      );
    }

    const transcriptDir = path.join(process.cwd(), 'public', transcriptId);
    const imagesJsonPath = path.join(transcriptDir, 'images.json');
    
    // Check if images.json exists
    if (!fs.existsSync(imagesJsonPath)) {
      return NextResponse.json(
        { success: false, error: 'No images found for this transcript' },
        { status: 404 }
      );
    }

    // Read current images data
    const imagesData = JSON.parse(fs.readFileSync(imagesJsonPath, 'utf8'));
    
    // Handle both old and new format
    let deleted = false;
    
    if (imagesData.images && Array.isArray(imagesData.images)) {
      // New format - delete by filename or index
      const originalLength = imagesData.images.length;
      
      if (filename) {
        // Delete by filename
        imagesData.images = imagesData.images.filter((img: { filename: string }) => img.filename !== filename);
        deleted = imagesData.images.length < originalLength;
        
        // Also try to delete the physical file
        const imagePath = path.join(transcriptDir, 'images', filename);
        if (fs.existsSync(imagePath)) {
          fs.unlinkSync(imagePath);
        }
      } else if (typeof imageIndex === 'number' && imageIndex >= 0 && imageIndex < originalLength) {
        // Delete by index
        const imageToDelete = imagesData.images[imageIndex];
        imagesData.images.splice(imageIndex, 1);
        deleted = true;
        
        // Try to delete the physical file
        if (imageToDelete && imageToDelete.filename) {
          const imagePath = path.join(transcriptDir, 'images', imageToDelete.filename);
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        }
      }
    } else if (imagesData[transcriptId] && Array.isArray(imagesData[transcriptId])) {
      // Old format - delete by index only
      if (typeof imageIndex === 'number' && imageIndex >= 0 && imageIndex < imagesData[transcriptId].length) {
        imagesData[transcriptId].splice(imageIndex, 1);
        deleted = true;
      }
    }
    
    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'Image not found or invalid parameters' },
        { status: 404 }
      );
    }
    
    // Write updated images data back
    fs.writeFileSync(imagesJsonPath, JSON.stringify(imagesData, null, 2));
    
    return NextResponse.json({
      success: true,
      message: 'Image deleted successfully'
    });
    
  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete image' },
      { status: 500 }
    );
  }
} 