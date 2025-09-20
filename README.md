# iWinnie Engagement Photo Upload App

A beautiful web application for friends and family to upload photos to your engagement celebration. Built with Next.js and Cloudflare R2 storage.

## Features

- 🖼️ **Photo Upload**: Drag and drop or click to select multiple photos
- ☁️ **Cloud Storage**: Photos are stored securely in Cloudflare R2
- 📱 **Responsive Design**: Works perfectly on desktop and mobile
- 🎨 **Beautiful UI**: Modern, elegant interface with engagement theme
- ⚡ **Fast Uploads**: Real-time progress indicators
- 🔒 **File Validation**: Automatic file type and size validation

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Cloudflare R2

1. Create a Cloudflare R2 bucket at [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Create API tokens with R2 permissions
3. Copy the environment variables from `env.example` to `.env.local`:

```bash
cp env.example .env.local
```

4. Fill in your Cloudflare R2 credentials in `.env.local`:

```env
CLOUDFLARE_R2_ACCESS_KEY_ID=your_access_key_id_here
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your_secret_access_key_here
CLOUDFLARE_R2_ENDPOINT=https://your-account-id.r2.cloudflarestorage.com
CLOUDFLARE_R2_BUCKET_NAME=your_bucket_name_here
CLOUDFLARE_R2_PUBLIC_URL=https://your-public-domain.com
```

### 3. Configure R2 Public Access

1. In your R2 bucket settings, enable public access
2. Set up a custom domain or use the R2.dev domain for public URLs
3. Update the `CLOUDFLARE_R2_PUBLIC_URL` in your environment variables

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add your environment variables in Vercel dashboard
4. Deploy!

### Deploy to Other Platforms

The app can be deployed to any platform that supports Next.js. Make sure to:

1. Set all environment variables
2. Configure the platform to handle larger file uploads (up to 40MB)
3. Ensure proper CORS configuration

## Environment Variables

| Variable                          | Description                             | Required |
| --------------------------------- | --------------------------------------- | -------- |
| `CLOUDFLARE_R2_ACCESS_KEY_ID`     | Your R2 access key ID                   | Yes      |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | Your R2 secret access key               | Yes      |
| `CLOUDFLARE_R2_ENDPOINT`          | Your R2 endpoint URL                    | Yes      |
| `CLOUDFLARE_R2_BUCKET_NAME`       | Your R2 bucket name                     | Yes      |
| `CLOUDFLARE_R2_PUBLIC_URL`        | Public URL for accessing uploaded files | Yes      |

## File Upload Limits

- **File Types**: Images and Videos (JPG, PNG, GIF, MP4, MOV, etc.)
- **File Size**: Maximum 40MB per file
- **Multiple Files**: Upload multiple files at once

## Customization

### Changing the Theme

The app uses a pink/purple engagement theme. To customize:

1. Update colors in `src/app/page.tsx`
2. Modify the gradient backgrounds
3. Change icons and branding

### Adding Features

- **User Authentication**: Add login/signup functionality
- **Photo Albums**: Organize photos into albums
- **Comments**: Allow friends to comment on photos
- **Download**: Add download functionality for uploaded photos

## Security Considerations

- File type validation prevents malicious uploads
- File size limits prevent abuse
- Unique filenames prevent conflicts
- CORS properly configured for cross-origin requests

## Support

For issues or questions, please check the [Next.js documentation](https://nextjs.org/docs) or [Cloudflare R2 documentation](https://developers.cloudflare.com/r2/).

---

Made with ❤️ for your special day!
