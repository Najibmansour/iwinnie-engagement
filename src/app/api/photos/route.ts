import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

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
const PUBLIC_URL = process.env.CLOUDFLARE_R2_PUBLIC_URL!;

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const prefix = searchParams.get('prefix') || 'engagement-photos/';
    const maxKeys = parseInt(searchParams.get('maxKeys') || '50');

    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await s3Client.send(listCommand);

    if (!response.Contents) {
      return NextResponse.json({ photos: [] });
    }

    const photos = response.Contents
      .filter(obj => obj.Key && obj.Key !== prefix) // Exclude the prefix itself
      .map(obj => ({
        id: obj.Key?.split('/').pop()?.split('.')[0] || '',
        name: obj.Key?.split('/').pop() || '',
        url: `${PUBLIC_URL}/${obj.Key}`,
        size: obj.Size || 0,
        uploadedAt: obj.LastModified,
        key: obj.Key,
      }))
      .sort((a, b) => {
        // Sort by upload date, newest first
        if (a.uploadedAt && b.uploadedAt) {
          return new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime();
        }
        return 0;
      });

    return NextResponse.json({
      photos,
      count: photos.length,
      hasMore: response.IsTruncated || false,
    });

  } catch (error) {
    console.error('Error listing photos:', error);
    return NextResponse.json(
      { error: 'Failed to list photos', message: error },
      { status: 500 }
    );
  }
}
