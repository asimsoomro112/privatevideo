# HerPrivateCinema

A private, premium, mobile-first video streaming app built with Next.js 15, TypeScript, Tailwind CSS, NextAuth credentials, Prisma + SQLite, Zustand, framer-motion, hls.js, and Cloudinary.

## Features

- Single-password private login. No public content routes.
- Hidden admin entry at `/vault-admin`; normal UI does not show admin links.
- Cloudinary video uploads with eager HLS generation.
- Custom hls.js player with resume progress, PiP, fullscreen, theater mode, speed control, and private pause/end messages.
- Long-form homepage with Continue Watching, Trending, Mood-Based Picks, New Additions, category rows, search, and My List.
- TikTok-style Shorts page for videos under 2 minutes.
- Mobile-first bottom navigation and touch-friendly cards/feed controls.
- Real admin upload with Cloudinary processing, metadata controls, edit/delete, publish/draft, featured toggles, and bulk upload CLI.
- Romantic message button with 50+ configurable English/Roman Urdu lines.
- shadcn-style local UI primitives in `components/ui`.

## Environment

Copy `.env.example` to `.env` and fill in values:

```bash
cp .env.example .env
```

Required:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
AUTH_SECRET="replace-with-the-same-long-random-secret"
NEXTAUTH_URL="http://localhost:3000"
PRIVATE_ACCESS_PASSWORD="change-this-password"
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
CLOUDINARY_STREAMING_PROFILE="full_hd"
CLOUDINARY_UPLOAD_FOLDER="herprivatecinema/videos"
NEXT_PUBLIC_SITE_NAME="HerPrivateCinema"
NEXT_PUBLIC_ACCENT_COLOR="#F43F7D"
```

## Local Setup

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

Open `http://localhost:3000`.

`npm run db:seed` creates the private user only and removes old StreamVault demo rows. It does not add fake videos.

## Private Access

- User login: `/login`
- Main app: `/`
- Shorts: `/shorts`
- Hidden admin entry: `/vault-admin`
- Admin dashboard after unlock: `/admin`
- Upload: `/admin/upload`
- Manage videos: `/admin/videos`

The admin API is blocked until `/vault-admin` has been opened after login.

## Cloudinary HLS Setup

This app uploads videos to Cloudinary using:

- `resource_type: "video"`
- `folder: CLOUDINARY_UPLOAD_FOLDER`
- eager HLS transformation:

```ts
{
  streaming_profile: process.env.CLOUDINARY_STREAMING_PROFILE || "full_hd",
  format: "m3u8"
}
```

Cloudinary URLs generated:

- HLS playback `.m3u8`
- 640x360 thumbnail
- 1280x720 poster
- 6-second MP4 hover preview

Optional:

```env
CLOUDINARY_NOTIFICATION_URL="https://your-domain.com/api/webhooks/cloudinary"
```

## Bulk Upload

Upload a whole local folder recursively:

```bash
npx tsx scripts/bulk-upload.ts "D:/Videos/My Folder"
```

The script detects categories from filenames and writes metadata to Prisma.

## Vercel Deployment

Deploying StreamVault on Vercel requires transitioning from SQLite to a hosted relational database (e.g. PostgreSQL) because Vercel operates on an ephemeral, serverless runtime where local files do not persist.

### 1. Configure the Database for Production

StreamVault includes a helper command to quickly switch the database provider in `prisma/schema.prisma`.

*   **Switch to PostgreSQL (Production):**
    ```bash
    npm run db:postgres
    ```
    This updates the database provider inside `prisma/schema.prisma` to `"postgresql"`.

*   **Switch to SQLite (Local Dev):**
    ```bash
    npm run db:sqlite
    ```
    This restores the provider inside `prisma/schema.prisma` to `"sqlite"` for local zero-config database storage.

### 2. Push Your Schema to PostgreSQL

Once you've switched to PostgreSQL, set your Postgres connection strings in your local environment and run Prisma's push command to create all tables in your cloud database instance (e.g. Supabase, Neon, Vercel Postgres):

```bash
# Switched to postgresql provider first
npm run db:postgres

# Supabase example:
# DATABASE_URL should be the Transaction Pooler URL.
# DIRECT_URL should be the Direct connection URL.

# Push the schema structure to your database
# (Ensure DATABASE_URL and DIRECT_URL are set in your terminal/environment)
npx prisma db push
```

### 3. Deploy to Vercel

1. Push the project to a GitHub repository (the included `.gitignore` will ensure your secrets and local `.db` files remain private).
2. Go to the [Vercel Dashboard](https://vercel.com) and import your repository.
3. Configure the following environment variables under **Settings > Environment Variables**:

   | Variable | Value/Description |
   | :--- | :--- |
   | `DATABASE_URL` | Supabase Transaction Pooler / pooler connection string, usually port `6543`. |
   | `DIRECT_URL` | Supabase direct connection string, usually port `5432`, used by Prisma schema operations. |
   | `NEXTAUTH_SECRET` | A secure, random 32-character secret (generate with `openssl rand -base64 32`). |
   | `AUTH_SECRET` | Match `NEXTAUTH_SECRET` (crucial for Auth.js/NextAuth v5 beta). |
   | `AUTH_TRUST_HOST` | Set to `true` (resolves authentication callbacks across dynamic domain redirects). |
   | `NEXTAUTH_URL` | Canonical URL of your deployment (e.g., `https://your-app.vercel.app`). |
   | `PRIVATE_ACCESS_PASSWORD` | The secret password users input to access your private cinema. |
   | `ADMIN_PASSWORD` | The admin password for modifying video items. |
   | `MEDIA_PROVIDER` | `bunny` (or `cloudinary`). |
   | `BUNNY_STREAM_LIBRARY_ID` | Your Bunny Stream Library ID. |
   | `BUNNY_STREAM_ACCESS_KEY` | Your Bunny Stream API key. |
   | `BUNNY_STREAM_HOSTNAME` | Your Bunny CDN hostname. |
   | `NEXT_PUBLIC_SITE_NAME` | Your custom Site name (e.g., `HerPrivateCinema`). |
   | `NEXT_PUBLIC_ACCENT_COLOR` | Theme accent hex color (e.g., `#F43F7D`). |

4. Click **Deploy**. Vercel will automatically trigger `"postinstall": "prisma generate"` during the install phase and compile the application.

> [!WARNING]
> **Serverless Upload Size Limit (4.5 MB):**
> Vercel has a hard limit of 4.5 MB on request payloads. Video uploads via the Admin Web UI (`/admin/upload`) *will fail* on Vercel for any video exceeding 4.5 MB.
>
> **How to upload videos in production:**
> Use the bulk-upload script from your local machine to upload videos directly to Bunny Stream, registering them in your production database:
> ```bash
> # Make sure local database provider matches production
> npm run db:postgres
> 
> # Execute bulk upload (using production DATABASE_URL in your local .env or terminal)
> npx tsx scripts/bulk-upload.ts "C:\Path\To\Your\Videos"
> ```


## Customization

- Brand name: `NEXT_PUBLIC_SITE_NAME`
- Theme colors: `app/globals.css`
- Categories/moods: `lib/categories.ts`
- Romantic messages: `lib/romantic-messages.ts`
- Upload behavior: `app/api/upload/route.ts`
- Bulk upload behavior: `scripts/bulk-upload.ts`
