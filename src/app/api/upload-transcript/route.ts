import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Function to get the next available transcript number (checking both localStorage and public folder)
async function getNextTranscriptNumber(existingLocalStorageNumbers: number[] = []): Promise<number> {
  let maxNumber = 0;
  
  // Check existing transcripts in public folder
  try {
    const fs = await import('fs');
    const path = await import('path');
    
    const publicDir = path.join(process.cwd(), 'public');
    
    if (fs.existsSync(publicDir)) {
      const items = fs.readdirSync(publicDir, { withFileTypes: true });
      
      items
        .filter(item => item.isDirectory())
        .map(item => item.name)
        .forEach(name => {
          const match = name.match(/^t(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNumber) {
              maxNumber = num;
            }
          }
        });
      
      console.log('Max transcript number from public folder:', maxNumber);
    }
  } catch (error) {
    console.log('Error checking public folder for transcript numbers:', error);
  }
  
  // Check localStorage transcript numbers
  if (existingLocalStorageNumbers.length > 0) {
    const maxLocalStorage = Math.max(...existingLocalStorageNumbers);
    if (maxLocalStorage > maxNumber) {
      maxNumber = maxLocalStorage;
    }
    console.log('Max transcript number from localStorage:', maxLocalStorage);
  }
  
  // If no transcripts exist, start from 1001 to avoid conflicts with existing ones
  if (maxNumber === 0) {
    maxNumber = 1000;
  }
  
  console.log('Next transcript number will be:', maxNumber + 1);
  return maxNumber + 1;
}

// Function to prepare files for client-side storage with chunking support
async function prepareTranscriptFiles(
  transcriptId: string,
  csvContent: string,
  originalBuffer: Buffer,
  originalFileName: string,
  speakerColors: { [key: string]: string }
) {
  console.log(`Preparing transcript ${transcriptId} for local storage`);
  
  // Check if CSV content is large and needs chunking
  const csvSizeInBytes = Buffer.byteLength(csvContent, 'utf8');
  const maxChunkSize = 4 * 1024 * 1024; // 4MB chunks to stay under localStorage limits
  
  if (csvSizeInBytes > maxChunkSize) {
    // Split CSV into chunks
    const chunks = [];
    const csvLines = csvContent.split('\n');
    const headerLine = csvLines[0];
    let currentChunk = headerLine + '\n';
    let chunkIndex = 0;
    
    for (let i = 1; i < csvLines.length; i++) {
      const line = csvLines[i] + '\n';
      
      // Check if adding this line would exceed chunk size
      if (Buffer.byteLength(currentChunk + line, 'utf8') > maxChunkSize && currentChunk !== headerLine + '\n') {
        chunks.push({
          filename: `transcript-chunk-${chunkIndex}.csv`,
          content: currentChunk.trim()
        });
        currentChunk = headerLine + '\n' + line;
        chunkIndex++;
      } else {
        currentChunk += line;
      }
    }
    
    // Add the last chunk
    if (currentChunk.trim() !== headerLine) {
      chunks.push({
        filename: `transcript-chunk-${chunkIndex}.csv`,
        content: currentChunk.trim()
      });
    }
    
    // Create files object with chunks
    const files: Record<string, string> = {};
    chunks.forEach(chunk => {
      files[chunk.filename] = chunk.content;
    });
    
    // Add metadata files
    files['speakers.json'] = JSON.stringify(speakerColors, null, 2);
    files['content.json'] = JSON.stringify({
      "gradeLevel": "Title...", 
      "lessonGoal": "Lesson Goal"
    }, null, 2);
    files['images.json'] = JSON.stringify({ "images": [] }, null, 2);
    files['chunk-info.json'] = JSON.stringify({
      totalChunks: chunks.length,
      totalSize: csvSizeInBytes,
      chunkSize: maxChunkSize
    }, null, 2);
    
    return {
      cloudStorage: false,
      transcriptId,
      files,
      originalFile: {
        name: originalFileName,
        buffer: originalBuffer.toString('base64')
      }
    };
  } else {
    // Use original logic for smaller files
    return {
      cloudStorage: false,
      transcriptId,
      files: {
        'transcript.csv': csvContent,
        'speakers.json': JSON.stringify(speakerColors, null, 2),
        'content.json': JSON.stringify({
          "gradeLevel": "Title...", 
          "lessonGoal": "Lesson Goal"
        }, null, 2),
        'images.json': JSON.stringify({ "images": [] }, null, 2)
      },
      originalFile: {
        name: originalFileName,
        buffer: originalBuffer.toString('base64')
      }
    };
  }
}

// Function to save transcript to public folder for session recovery
async function saveToPublicFolder(
  transcriptId: string,
  csvContent: string,
  speakerColors: { [key: string]: string },
  contentData: Record<string, unknown>,
  imagesData: Record<string, unknown>
): Promise<void> {
  const transcriptDir = join(process.cwd(), 'public', transcriptId);
  
  try {
    mkdirSync(transcriptDir, { recursive: true });
  } catch {
    // Directory might already exist, that's okay
  }

  // Save all transcript files
  writeFileSync(join(transcriptDir, 'transcript.csv'), csvContent);
  writeFileSync(join(transcriptDir, 'speakers.json'), JSON.stringify(speakerColors, null, 2));
  writeFileSync(join(transcriptDir, 'content.json'), JSON.stringify(contentData, null, 2));
  writeFileSync(join(transcriptDir, 'images.json'), JSON.stringify(imagesData, null, 2));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const existingNumbersStr = formData.get('existingNumbers') as string;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    // Parse existing transcript numbers from localStorage
    let existingNumbers: number[] = [];
    if (existingNumbersStr) {
      try {
        existingNumbers = JSON.parse(existingNumbersStr);
      } catch (error) {
        console.log('Error parsing existing numbers:', error);
      }
    }

    // Check file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      return NextResponse.json({ error: 'Only Excel files (.xlsx, .xls) and CSV files (.csv) are supported' }, { status: 400 });
    }

    // Check file size (limit to 200MB)
    if (file.size > 200 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 200MB' }, { status: 400 });
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    let jsonData: unknown[][];
    
    if (file.name.endsWith('.csv')) {
      // Parse CSV file
      const csvText = buffer.toString('utf-8');
      const rows = csvText.split('\n').filter(row => row.trim() !== '');
      
      jsonData = rows.map(row => {
        // Simple CSV parsing - handle quoted fields
        const cells = [];
        let currentCell = '';
        let inQuotes = false;
        
        for (let i = 0; i < row.length; i++) {
          const char = row[i];
          
          if (char === '"') {
            if (inQuotes && row[i + 1] === '"') {
              // Escaped quote
              currentCell += '"';
              i++; // Skip next quote
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // End of cell
            cells.push(currentCell.trim());
            currentCell = '';
          } else {
            currentCell += char;
          }
        }
        
        // Add the last cell
        cells.push(currentCell.trim());
        return cells;
      });
    } else {
      // Read the Excel file
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON
      jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    }
    
    if (jsonData.length === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    if (jsonData.length < 2) {
      return NextResponse.json({ error: 'File must contain at least one data row' }, { status: 400 });
    }

    // Get headers (first row)
    const headers = jsonData[0] as string[];
    
    // Check for required columns
    const requiredColumns = ['#', 'Speaker', 'Dialogue'];
    const missingColumns = requiredColumns.filter(col => !headers.includes(col));
    
    if (missingColumns.length > 0) {
      return NextResponse.json({ 
        error: `Missing required columns: ${missingColumns.join(', ')}` 
      }, { status: 400 });
    }

    // Find column indices
    const hashIndex = headers.indexOf('#');
    const speakerIndex = headers.indexOf('Speaker');
    const dialogueIndex = headers.indexOf('Dialogue');

    // Extract data rows (skip header)
    const dataRows = jsonData.slice(1) as unknown[][];
    
    // Validate data rows
    const validRows = dataRows.filter(row => {
      return row && 
             row.length > Math.max(hashIndex, speakerIndex, dialogueIndex) &&
             row[speakerIndex] && 
             row[dialogueIndex] &&
             String(row[speakerIndex]).trim() !== '' &&
             String(row[dialogueIndex]).trim() !== '';
    });

    if (validRows.length === 0) {
      return NextResponse.json({ error: 'No valid data rows found' }, { status: 400 });
    }
    
    // Get unique speakers
    const speakers = new Set<string>();
    validRows.forEach(row => {
      if (row[speakerIndex] && typeof row[speakerIndex] === 'string') {
        speakers.add(row[speakerIndex].trim());
      }
    });

    if (speakers.size === 0) {
      return NextResponse.json({ error: 'No valid speakers found' }, { status: 400 });
    }

    // Generate speaker colors
    const speakerColors: { [key: string]: string } = {};
    const colorClasses = [
      'bg-red-200', 'bg-blue-200', 'bg-green-200', 'bg-yellow-200', 
      'bg-purple-200', 'bg-pink-200', 'bg-indigo-200', 'bg-gray-200',
      'bg-orange-200', 'bg-teal-200', 'bg-cyan-200', 'bg-lime-200'
    ];
    
    Array.from(speakers).forEach((speaker, index) => {
      speakerColors[speaker] = colorClasses[index % colorClasses.length];
    });

    // Get next available transcript number
    const nextNumber = await getNextTranscriptNumber(existingNumbers);
    const transcriptId = `t${nextNumber.toString().padStart(3, '0')}`;
    
    // Save transcript as CSV (use valid rows only)
    const csvContent = validRows.map(row => {
      return row.map(cell => {
        if (cell === null || cell === undefined) return '';
        const cellStr = String(cell);
        // Escape quotes and wrap in quotes if contains comma or quote
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',');
    }).join('\n');
    
    const csvHeader = headers.join(',');
    const fullCsvContent = csvHeader + '\n' + csvContent;
    
    // Prepare files for client-side storage
    const prepareResult = await prepareTranscriptFiles(
      transcriptId,
      fullCsvContent,
      buffer,
      file.name,
      speakerColors
    );

    // Also save to public folder for session recovery
    try {
      await saveToPublicFolder(
        transcriptId,
        fullCsvContent,
        speakerColors,
        {
          "gradeLevel": "Title...", 
          "lessonGoal": "Lesson Goal"
        },
        { "images": [] }
      );
      console.log(`Transcript ${transcriptId} saved to public folder for session recovery`);
    } catch (publicSaveError) {
      console.error('Failed to save to public folder:', publicSaveError);
      // Don't fail the upload if public save fails - it's for recovery only
    }

    return NextResponse.json({ 
      success: true, 
      transcriptId,
      speakers: Array.from(speakers),
      rowCount: validRows.length,
      storage: prepareResult
    });

  } catch (error) {
    console.error('Error processing transcript upload:', error);
    return NextResponse.json({ 
      error: 'Failed to process transcript file' 
    }, { status: 500 });
  }
} 