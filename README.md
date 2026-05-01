# Weather Now Kentucky

Production-ready Next.js App Router weather site for Kentucky forecasts, alerts, live coverage, blog posts, sponsors, and admin controls.

## Stack

- Next.js App Router
- TypeScript
- Weather.gov API
- Firebase Auth
- Firestore

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env.local` and add Firebase web app values.

3. Enable Firebase Auth email/password sign-in.

4. Create Firestore collections:

   - `settings/site` document with `forecastOverride`, `isLive`, and `youtubeVideoId`
   - `posts`
   - `sponsors`

5. Start the app:

   ```bash
   npm run dev
   ```

## Data Model

`settings/site`

```json
{
  "forecastOverride": "",
  "isLive": false,
  "youtubeVideoId": ""
}
```

`posts`

```json
{
  "title": "Storm Update",
  "slug": "storm-update",
  "excerpt": "Short summary",
  "body": "Full post text",
  "publishedAt": "server timestamp"
}
```

`sponsors`

```json
{
  "name": "Sponsor Name",
  "description": "Short sponsor line",
  "url": "https://example.com",
  "logoUrl": "https://example.com/logo.png"
}
```

## Weather.gov

The home page detects browser location, calls `/api/forecast`, and the route handler resolves Weather.gov `/points/{lat},{lon}` to the proper gridpoint forecast endpoint. The alerts page requests active alerts for Kentucky.
