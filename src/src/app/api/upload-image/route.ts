import { NextRequest, NextResponse } from 'next/server';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function GET() {
  return NextResponse.json({ message: 'Upload image API is working' });
}

export async function POST(request: NextRequest) {
  console.log('=== Image upload request received ===');
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const transcriptId = formData.get('transcriptId') as string;
    
    console.log('File:', file?.name, 'Type:', file?.type, 'Size:', file?.size);
    console.log('Transcript ID:', transcriptId);
    
    if (!file) {
      console.log('No file provided');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!transcriptId) {
      console.log('No transcript ID provided');
      return NextResponse.json({ error: 'No transcript ID provided' }, { status: 400 });
    }

    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      console.log('Invalid file type:', file.type);
      return NextResponse.json({ 
        error: 'Only image files (JPEG, PNG, GIF, WebP) are supported' 
      }, { status: 400 });
    }

    // Check file size (limit to 5MB, minimum 100 bytes to avoid placeholder images)
    if (file.size > 5 * 1024 * 1024) {
      console.log('File too large:', file.size);
      return NextResponse.json({ error: 'File size must be less than 5MB' }, { status: 400 });
    }

    if (file.size < 100) {
      console.log('File too small (likely placeholder):', file.size);
      return NextResponse.json({ error: 'File appears to be a placeholder or corrupted (too small)' }, { status: 400 });
    }

    // Convert file to buffer
    console.log('Converting file to buffer...');
    const buffer = Buffer.from(await file.arrayBuffer());
    console.log('Buffer length:', buffer.length);
    
    // Create transcript directory if it doesn't exist
    const transcriptDir = join(process.cwd(), 'public', transcriptId);
    console.log('Transcript dir:', transcriptDir);
    await mkdir(transcriptDir, { recursive: true });
    
    // Create images subdirectory
    const imagesDir = join(transcriptDir, 'images');
    console.log('Images dir:', imagesDir);
    await mkdir(imagesDir, { recursive: true });
    
    // Generate unique filename
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `image_${timestamp}.${fileExtension}`;
    const filePath = join(imagesDir, fileName);
    console.log('File path:', filePath);
    
    // Save the image file
    console.log('Writing file...');
    await writeFile(filePath, buffer);
    console.log('File written successfully');
    
    // Update images.json
    const imagesJsonPath = join(transcriptDir, 'images.json');
    console.log('Updating images.json at:', imagesJsonPath);
    
    let imagesData: { images: Array<{ url: string; filename: string; uploadedAt: string; originalName: string }> } = { images: [] };
    
    try {
      const existingData = await readFile(imagesJsonPath, 'utf-8');
      const parsedData = JSON.parse(existingData);
      console.log('Existing images.json loaded, keys:', Object.keys(parsedData));
      
      // Check if it's the new format (has images array) or old format
      if (parsedData.images && Array.isArray(parsedData.images)) {
        // New format - use as is
        imagesData = parsedData;
        console.log('Using new format, existing images count:', imagesData.images.length);
      } else {
        // Old format - convert to new format but preserve old structure
        imagesData = { images: [] };
        console.log('Old format detected, creating new images array');
      }
    } catch (error) {
      // File doesn't exist or is invalid, use default structure
      console.log('Creating new images.json file, error:', error);
      imagesData = { images: [] };
    }
    
    // Ensure images array exists
    if (!imagesData.images || !Array.isArray(imagesData.images)) {
      imagesData.images = [];
      console.log('Initialized empty images array');
    }
    
    // Add the new image to the images array
    const imageUrl = `/${transcriptId}/images/${fileName}`;
    const newImage = {
      url: imageUrl,
      filename: fileName,
      uploadedAt: new Date().toISOString(),
      originalName: file.name
    };
    
    imagesData.images.push(newImage);
    console.log('Added new image:', newImage);
    
    // Read existing data again to preserve old format if it exists
    let finalData = imagesData;
    try {
      const existingData = await readFile(imagesJsonPath, 'utf-8');
      const parsedExisting = JSON.parse(existingData);
      
      // If old format exists, merge with it
      if (parsedExisting[transcriptId] || parsedExisting.segments || parsedExisting.links) {
        finalData = {
          ...parsedExisting,
          images: imagesData.images
        };
        console.log('Merged with existing old format data');
      }
    } catch {
      // Use new format only
      console.log('Using new format only');
    }
    
    // Save updated images.json
    await writeFile(imagesJsonPath, JSON.stringify(finalData, null, 2));
    console.log('images.json updated successfully');
    
    return NextResponse.json({ 
      success: true, 
      imageUrl,
      filename: fileName,
      message: 'Image uploaded successfully'
    });

  } catch (error) {
    console.error('=== Error uploading image ===');
    console.error('Error details:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json({ 
      error: `Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
} 