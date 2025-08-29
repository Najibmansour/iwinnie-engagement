import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

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

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileExtension = file.name.split('.').pop();
    const fileName = `engagement-photos/${timestamp}-${randomString}.${fileExtension}`;

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
      },
    });

    await s3Client.send(uploadCommand);

    // Generate public URL
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${fileName}`;

    return NextResponse.json({
      id: `${timestamp}-${randomString}`,
      name: file.name,
      url: publicUrl,
      size: file.size,
      type: file.type,
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
