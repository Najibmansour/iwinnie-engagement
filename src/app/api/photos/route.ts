import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { logger } from '@/lib/logger';

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
  logger.configError('photos-api', missingEnvVars);
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
  const startTime = Date.now();
  const url = new URL(request.url);

  logger.apiRequest('GET', '/api/photos', {
    searchParams: Object.fromEntries(url.searchParams.entries())
  });

  try {
    // Check if environment variables are properly set
    if (missingEnvVars.length > 0) {
      logger.apiResponse('GET', '/api/photos', 500, Date.now() - startTime, {
        error: 'Missing environment variables',
        missing_vars: missingEnvVars
      });
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

    logger.r2Operation('list', BUCKET_NAME, prefix, {
      prefix,
      maxKeys
    });

    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET_NAME,
      Prefix: prefix,
      MaxKeys: maxKeys,
    });

    const response = await s3Client.send(listCommand);

    logger.debug('R2 List Response', {
      found_objects: response.Contents?.length || 0,
      is_truncated: response.IsTruncated
    });

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

    const responseData = {
      photos,
      count: photos.length,
      hasMore: response.IsTruncated || false,
    };

    logger.apiResponse('GET', '/api/photos', 200, Date.now() - startTime, {
      photos_count: photos.length,
      has_more: response.IsTruncated || false
    });

    return NextResponse.json(responseData);

  } catch (error) {
    logger.r2Error('list', error, BUCKET_NAME, undefined, {
      request_url: request.url
    });

    logger.apiResponse('GET', '/api/photos', 500, Date.now() - startTime, {
      error: 'Failed to list photos'
    });

    return NextResponse.json(
      { error: 'Failed to list photos', message: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
