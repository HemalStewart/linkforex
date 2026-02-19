## Getting Started

Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000).

## Vercel + External Backend

This admin panel now supports running on Vercel with a separate backend (like your EC2 API).

Use these environment variables in Vercel:

- `BACKEND_API_BASE_URL=http://13.48.194.142/api`
- `BACKEND_PUBLIC_BASE_URL=http://13.48.194.142` (optional, used for file/document proxy)
- `NEXT_PUBLIC_API_BASE_URL=/api/proxy` (keep this default)
- `NEXT_PUBLIC_UPLOADS_BASE_URL=/api/uploads` (keep this default)

Notes:

- Browser calls go to Next.js proxy routes (`/api/proxy/*` and `/api/uploads/*`), so frontend can stay on HTTPS even if backend is still HTTP.
- `X-Acting-User-Id` and `acting_user_id` behavior remains intact.

## Build

```bash
npm run build
```

## Deploy

Deploy directly to Vercel and set the environment variables above.
