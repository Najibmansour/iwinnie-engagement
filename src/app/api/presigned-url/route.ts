import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
  logger.configError('presigned-url-api', missingEnvVars);
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
    logger.r2Operation('list-check-duplicates', bucketName, `engagement-photos/${userFileName}`, {
      checking_for: userFileName
    });

    const response = await s3Client.send(listCommand);
    const existingFiles = response.Contents || [];

    logger.debug('Duplicate check result', {
      user_filename: userFileName,
      existing_files_count: existingFiles.length
    });

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
    logger.r2Error('list-check-duplicates', error, bucketName, undefined, {
      user_filename: userFileName,
      fallback_to_timestamp: true
    });
    // If there's an error checking, fall back to timestamp-based naming
    const timestamp = Date.now();
    return `engagement-photos/${cleanUserName}_${baseName}_${timestamp}.${fileExtension}`;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  logger.apiRequest('POST', '/api/presigned-url');

  try {
    // Check if environment variables are properly set
    if (missingEnvVars.length > 0) {
      logger.apiResponse('POST', '/api/presigned-url', 500, Date.now() - startTime, {
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

    const body = await request.json();
    const { fileName, fileType, fileSize, userName } = body;

    logger.debug('Presigned URL request details', {
      file_name: fileName,
      file_type: fileType,
      file_size: fileSize,
      user_name: userName
    });

    if (!fileName || !fileType || !fileSize) {
      logger.apiResponse('POST', '/api/presigned-url', 400, Date.now() - startTime, {
        error: 'Missing required fields'
      });
      return NextResponse.json(
        { error: 'Missing required fields: fileName, fileType, fileSize' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!fileType.startsWith('image/') && !fileType.startsWith('video/')) {
      logger.apiResponse('POST', '/api/presigned-url', 400, Date.now() - startTime, {
        error: 'Invalid file type',
        file_type: fileType,
        file_name: fileName
      });
      return NextResponse.json(
        { error: 'Only image and video files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (40MB limit)
    const maxSize = 100 * 1024 * 1024; // 40MB
    if (fileSize > maxSize) {
      logger.apiResponse('POST', '/api/presigned-url', 400, Date.now() - startTime, {
        error: 'File too large',
        file_size: fileSize,
        max_size: maxSize,
        file_name: fileName
      });
      return NextResponse.json(
        { error: 'File size must be less than 40MB' },
        { status: 400 }
      );
    }

    // Generate unique filename using user name
    const uniqueFileName = await generateUniqueFileName(s3Client, BUCKET_NAME, fileName, userName);

    logger.info('Generated unique filename for presigned URL', {
      original_name: fileName,
      generated_name: uniqueFileName,
      user_name: userName
    });

    // Create presigned URL for upload
    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: uniqueFileName,
      ContentType: fileType,
      Metadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
        userName: userName || 'anonymous',
      },
    });

    const presignedUrl = await getSignedUrl(s3Client, command, {
      expiresIn: 3600 // 1 hour
    });

    logger.r2Operation('generate-presigned-url', BUCKET_NAME, uniqueFileName, {
      file_size: fileSize,
      content_type: fileType,
      user_name: userName,
      original_name: fileName,
      expires_in: 3600
    });

    // Generate public URL for after upload
    const publicUrl = `${process.env.CLOUDFLARE_R2_PUBLIC_URL}/${uniqueFileName}`;

    const responseData = {
      presignedUrl,
      fileName: uniqueFileName,
      publicUrl,
      metadata: {
        originalName: fileName,
        userName: userName || 'anonymous',
        uploadedAt: new Date().toISOString(),
      }
    };

    logger.apiResponse('POST', '/api/presigned-url', 200, Date.now() - startTime, {
      file_name: uniqueFileName,
      file_size: fileSize,
      public_url: publicUrl
    });

    return NextResponse.json(responseData);

  } catch (error) {
    logger.r2Error('generate-presigned-url', error, BUCKET_NAME, undefined, {
      request_url: request.url
    });

    logger.apiResponse('POST', '/api/presigned-url', 500, Date.now() - startTime, {
      error: 'Failed to generate presigned URL'
    });

    return NextResponse.json(
      { error: 'Failed to generate presigned URL', message: error instanceof Error ? error.message : String(error) },
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