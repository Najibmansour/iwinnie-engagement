import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

// Check if environment variables are set
const requiredEnvVars = {
  CLOUDFLARE_R2_ACCESS_KEY_ID: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
  CLOUDFLARE_R2_SECRET_ACCESS_KEY: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
  CLOUDFLARE_R2_ENDPOINT: process.env.CLOUDFLARE_R2_ENDPOINT,
  CLOUDFLARE_R2_BUCKET_NAME: process.env.CLOUDFLARE_R2_BUCKET_NAME,
  CLOUDFLARE_R2_PUBLIC_URL: process.env.CLOUDFLARE_R2_PUBLIC_URL,
};

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('Missing environment variables:', missingEnvVars);
}

// Initialize S3 client for Cloudflare R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: process.env.CLOUDFLARE_R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME!;

// Function to generate a unique filename
async function generateUniqueFileName(
  s3Client: S3Client,
  bucketName: string,
  baseFileName: string,
  userName: string | null
): Promise<string> {
  const fileExtension = baseFileName.split('.').pop();
  const baseName = baseFileName.replace(/\.[^/.]+$/, ""); // Remove extension
  
  // Create a clean version of the user name for the filename
  const cleanUserName = userName ? userName.replace(/[^a-zA-Z0-9-_]/g, '_') : 'anonymous';
  
  // Create the base filename with user name
  const userFileName = `${cleanUserName}_${baseName}`;
  
  // Check if this exact filename exists
  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: `engagement-photos/${userFileName}`,
    MaxKeys: 1000, // Get all files with this prefix
  });

  try {
    const response = await s3Client.send(listCommand);
    const existingFiles = response.Contents || [];
    
    // Extract just the filenames (without path and extension)
    const existingFileNames = existingFiles
      .map(obj => obj.Key?.split('/').pop()?.replace(/\.[^/.]+$/, ""))
      .filter(Boolean);
    
    // If the exact filename doesn't exist, use it
    if (!existingFileNames.includes(userFileName)) {
      return `engagement-photos/${userFileName}.${fileExtension}`;
    }
    
    // Find the highest index for this filename
    let maxIndex = 0;
    const pattern = new RegExp(`^${userFileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d+)$`);
    
    existingFileNames.forEach(name => {
      const match = name?.match(pattern);
      if (match) {
        const index = parseInt(match[1], 10);
        if (index > maxIndex) {
          maxIndex = index;
        }
      }
    });
    
    // Return filename with next index
    return `engagement-photos/${userFileName}_${maxIndex + 1}.${fileExtension}`;
  } catch (error) {
    console.error('Error checking for existing files:', error);
    // If there's an error checking, fall back to timestamp-based naming
    const timestamp = Date.now();
    return `engagement-photos/${cleanUserName}_${baseName}_${timestamp}.${fileExtension}`;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if environment variables are properly set
    if (missingEnvVars.length > 0) {
      return NextResponse.json(
        {
          error: 'Server configuration error',
          message: `Missing environment variables: ${missingEnvVars.join(', ')}`
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userName = formData.get('userName') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      );
    }

    // Generate unique filename using user name
    const fileName = await generateUniqueFileName(s3Client, BUCKET_NAME, file.name, userName);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    console.log('Uploading to bucket:', BUCKET_NAME);
    console.log('File name:', fileName);

    // Upload to R2
    const uploadCommand = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      Metadata: {
        originalName: file.name,
        uploadedAt: new Date().toISOString(),
        userName: userName || 'anonymous',
      },
    });

    await s3Client.send(uploadCommand);

    // Generate public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;

    return NextResponse.json({
      id: fileName.split('/').pop()?.split('.')[0] || '',
      name: file.name,
      url: publicUrl,
      size: file.size,
      type: file.type,
      fileName: fileName,
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', message: error },
      { status: 500 }
    );
  }
}

// Handle OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
