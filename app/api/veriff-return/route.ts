import { NextRequest, NextResponse } from 'next/server';

const APP_RETURN_URL = 'linkforex://veriff-complete';

export async function GET(request: NextRequest) {
    const appUrl = new URL(APP_RETURN_URL);
    request.nextUrl.searchParams.forEach((value, key) => {
        appUrl.searchParams.set(key, value);
    });

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Returning to LinkForex</title>
  <meta http-equiv="refresh" content="0;url=${appUrl.toString()}" />
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #08111f; color: #fff; font-family: Arial, sans-serif; }
    main { max-width: 420px; padding: 32px; text-align: center; }
    a { color: #18c08f; font-weight: 700; }
  </style>
</head>
<body>
  <main>
    <h1>Returning to LinkForex</h1>
    <p>If the app does not open automatically, tap below.</p>
    <p><a href="${appUrl.toString()}">Open LinkForex App</a></p>
  </main>
  <script>window.location.replace(${JSON.stringify(appUrl.toString())});</script>
</body>
</html>`;

    return new NextResponse(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'no-store',
        },
    });
}
