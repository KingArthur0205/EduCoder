import { Storage } from '@google-cloud/storage';
import { NextResponse } from 'next/server';

// Create a Storage instance with explicit credentials
let storage: Storage;
try {
  // Decode the Base64-encoded credentials from the environment variable
  const credentialsJson = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64 || '', 'base64').toString();
  const credentials = JSON.parse(credentialsJson);
  
  storage = new Storage({
    credentials,
    projectId: credentials.project_id
  });
  console.log('Google Cloud Storage initialized successfully for project:', credentials.project_id);
} catch (error) {
  console.error('Error initializing Google Cloud Storage:', error);
}

// Specify the name of your bucket
const bucketName = process.env.GOOGLE_CLOUD_BUCKET_NAME || 'mol_temp1';

export async function POST(request: Request) {
  try {
    if (!storage) {
      throw new Error('Google Cloud Storage client not properly initialized');
    }
    
    const body = await request.json(); // Get the JSON data from the request
    const { tableData, notes, customText, email, transcriptNumber  } = body;

    // Prepare the data to save
    const dataToSave = { tableData, customText, email, notes };

    // Sanitize email to use as a valid file name
    const sanitizedEmail = sanitizeEmail(email);

    // Define the file path and name in GCS
    const fileName = `lesson${transcriptNumber}_${sanitizedEmail}.json`;

    // Get a reference to the bucket
    const bucket = storage.bucket(bucketName);

    // Create a file object in the bucket
    const file = bucket.file(fileName);

    // Write the data to the GCS file
    await file.save(JSON.stringify(dataToSave, null, 2));

    return NextResponse.json({ message: 'Data saved to Google Cloud Storage successfully!' });
  } 
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  catch (error: any) {
    console.error('Error saving data:', error);
    return NextResponse.json({ message: `Error saving data: ${error?.message || 'Unknown error'}` }, { status: 500 });
  }
}

// Helper function to sanitize email to be a valid file name
function sanitizeEmail(email: string): string {
  return email.replace(/[^a-zA-Z0-9]/g, '_'); // Replace invalid characters with '_'
}