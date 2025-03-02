# SendQuill - Email Mail Merge Application

A modern mail merge application for personalized email campaigns with tracking, templates, and contact management.

## Features

- **Email Campaign Management**: Create, schedule, and track email campaigns
- **Contact Management**: Import and organize contacts with custom fields
- **Template System**: Create reusable email templates with placeholders
- **Email Tracking**: Track email opens and link clicks
- **Analytics Dashboard**: View campaign performance metrics
- **User Authentication**: Secure account system with Google OAuth

## Technology Stack

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (development), PostgreSQL (production)
- **Authentication**: NextAuth.js with Google OAuth
- **Email Sending**: Gmail API
- **Tracking**: Custom pixel tracking system

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run the development server: `npm run dev`
5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Environment Variables

Copy `.env.example` to `.env.local` and fill in the required values:

```
# Base URL for tracking
NEXT_PUBLIC_APP_URL=https://your-domain.com

# Database
DATABASE_URL=file:./dev.db

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Firebase Web Configuration (client-side)
NEXT_PUBLIC_FIREBASE_API_KEY=your-firebase-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=your-measurement-id

# Firebase Admin SDK (server-side)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="your-private-key-with-quotes"

# Optional API Keys
OPENAI_API_KEY=your-openai-key
ANTHROPIC_API_KEY=your-anthropic-key
REPLICATE_API_TOKEN=your-replicate-token
DEEPGRAM_API_KEY=your-deepgram-key
```

## Author

Created by Gluepower

## Setting Up Firebase Authentication with Gmail API

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select an existing one
3. Enable Authentication and add Google as a sign-in method
4. In the Google sign-in provider settings, add the following OAuth scopes:
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`
5. Create a web app in your Firebase project and copy the configuration
6. Set up Firebase Admin SDK:
   - Go to Project Settings > Service Accounts
   - Generate a new private key and download the JSON file
   - Extract the necessary values for your environment variables

## Setting Up Email Sending with Gmail API

The application uses the Gmail API to send emails through Firebase Authentication. To enable email sending:

1. Make sure you have set up Firebase Authentication with the Gmail API scopes.
2. Set up a cron job in Vercel to process scheduled campaigns:

### Setting Up Vercel Cron Jobs

1. In your Vercel project settings, go to the "Cron Jobs" tab.
2. Add a new cron job with the following settings:
   - Name: `Process Campaigns`
   - Schedule: `* * * * *` (runs every minute)
   - HTTP Method: `GET`
   - Path: `/api/campaigns/process`
   - Secret Header Name: `Authorization`
   - Secret Header Value: Set this to a Firebase ID token (you'll need to update this regularly)

3. For local development, you can use a tool like [node-cron](https://www.npmjs.com/package/node-cron) to set up a cron job:
   ```javascript
   const cron = require('node-cron');
   const fetch = require('node-fetch');

   // Run every minute
   cron.schedule('* * * * *', async () => {
     try {
       // Get a Firebase ID token (you'll need to implement this)
       const idToken = await getFirebaseIdToken();
       
       const response = await fetch('http://localhost:3000/api/campaigns/process', {
         method: 'GET',
         headers: {
           'Authorization': `Bearer ${idToken}`
         }
       });
       
       const result = await response.json();
       console.log('Processed campaigns:', result);
     } catch (error) {
       console.error('Error processing campaigns:', error);
     }
   });
   ```

### How Email Sending Works

1. When a user creates a campaign and clicks "Send Now", the campaign status is set to "SENDING".
2. The API creates campaign recipients in the database for each contact in the selected list.
3. The cron job or manual processing triggers the `/api/campaigns/process` endpoint.
4. The endpoint processes all campaigns with "SENDING" status:
   - It retrieves the Gmail access token from the user's cookies.
   - It sends personalized emails to each recipient using the Gmail API.
   - It updates the status of each recipient and the campaign.

### Manual Processing

You can also manually process campaigns:
1. From the campaign detail page, click the "Process Campaign" button for campaigns with "SENDING" status.
2. From the campaign list page, click the "Send Now" button for draft campaigns to immediately send them.

## License

MIT License

Copyright (c) 2024 Gluepower

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

# Email Campaign Tracking Implementation

This implementation provides real email tracking capabilities for campaigns:

## Components

1. **Database Schema**
   - Added `Event` model in Prisma to track email opens and clicks
   - Linked events to campaign recipients

2. **Tracking APIs**
   - `/api/tracking/open` - Records email opens using a transparent tracking pixel
   - `/api/tracking/click` - Records link clicks and redirects to the original destination URL

3. **Email Content Processing**
   - `tracking-utils.ts` - Adds tracking pixels and converts links to tracked links
   - Handles personalization of email content

4. **Campaign Sending**
   - `campaign-sender.ts` - Sends emails with tracking enabled
   - `/api/campaigns/send` - API endpoint to trigger campaign sending

5. **Analytics**
   - Updated analytics API to use real event data
   - Filters and aggregates events for reporting

## How It Works

1. **Open Tracking**: A 1x1 transparent pixel is added to each email. When loaded, it calls our tracking API.
2. **Click Tracking**: Links in emails are replaced with tracking URLs that record the click before redirecting.
3. **Personalization**: Content is personalized for each recipient before sending.
4. **Event Recording**: Events are stored in the database with metadata (timestamp, user agent, IP).
5. **Analytics**: Event data is queried and aggregated for the analytics dashboard.

## Usage

To send a campaign with tracking:

```typescript
// Call the campaign sending API with campaign ID and Gmail access token
fetch('/api/campaigns/send', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${firebaseIdToken}`
  },
  body: JSON.stringify({
    campaignId: 'campaign-id-here',
    accessToken: gmailAccessToken
  })
})
```

## Implementation Details

1. **Tracking Pixel**: A transparent GIF returned by the open tracking endpoint.
2. **Link Transformation**: Original links are encoded and wrapped in tracking URLs.
3. **Event Storage**: Events are stored with type (OPEN/CLICK) and metadata.
4. **Analytics Processing**: Events are filtered and aggregated for reporting.

## Limitations

1. Open tracking may not work if images are blocked by the email client.
2. Click tracking only works for HTML links (not plain text).
3. Some anti-tracking email clients may detect and disable tracking.

# SendQuill Email Marketing Platform

A modern email marketing platform for creating, scheduling, and tracking email campaigns.

## Features

- Contact management
- Email template creation with rich text editor
- Campaign scheduling and delivery
- Analytics and tracking
- User authentication
- Responsive design for all devices

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **Email Delivery**: Gmail API
- **Styling**: Tailwind CSS with custom theme
- **Hosting**: Vercel

## Environment Setup

1. Copy `.env.example` to `.env.local`
2. Fill in your credentials:

```
# IMPORTANT: Never commit .env.local to version control!
```

### Required Environment Variables

- **Firebase Web Configuration**:  
  Create a Firebase project and get your credentials from the Firebase Console

- **Google OAuth**:  
  Set up OAuth credentials in the Google Cloud Console with Gmail API access

- **Firebase Admin SDK**:  
  Generate a new private key from your Firebase project settings

## Security Notice

⚠️ **IMPORTANT SECURITY WARNING**:

- Never commit `.env.local` or any files containing real API keys/secrets to Git
- Keep your Firebase private key secure - it provides admin access to your project
- Rotate credentials if you suspect they may have been exposed
- Use environment variables for all sensitive information

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

## Deployment

This project is designed to be deployed on Vercel. Configure your environment variables in the Vercel dashboard before deploying.

```bash
# Deploy to Vercel
vercel
```

## License

MIT License

Copyright (c) 2024 Gluepower

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.