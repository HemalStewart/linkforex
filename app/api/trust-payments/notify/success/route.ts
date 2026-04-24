import { NextResponse } from "next/server";
import {
  computeResponseSiteSecurity,
  parseFormData,
  timingSafeEqualHex,
} from "@/app/lib/trust-payments";

export const runtime = "nodejs";

async function forwardToBackend(flat: Record<string, string>) {
  const backendBase = process.env.BACKEND_API_BASE_URL?.trim();
  const webhookSecret = process.env.TRUST_PAYMENTS_WEBHOOK_SECRET?.trim();

  if (!backendBase || !webhookSecret) {
    return NextResponse.json(
      { status: 503, message: "Backend webhook forwarding is not configured." },
      { status: 503 }
    );
  }

  const url = `${backendBase.replace(/\/+$/, "")}/trust-payments/notify`;

  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(flat)) body.set(k, v);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-TrustPayments-Webhook-Secret": webhookSecret,
    },
    body,
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
  });
}

export async function POST(req: Request) {
  const password = process.env.TRUST_PAYMENTS_SITE_SECURITY_PASSWORD?.trim();
  if (!password) {
    return NextResponse.json(
      { status: 503, message: "Trust Payments is not configured." },
      { status: 503 }
    );
  }

  const formData = await req.formData();
  const { values, flat } = parseFormData(formData);

  const received = (flat["responsesitesecurity"] || "").toLowerCase();
  if (!received) {
    return NextResponse.json(
      { status: 400, message: "Missing responsesitesecurity." },
      { status: 400 }
    );
  }

  const expected = computeResponseSiteSecurity(values, password);
  if (!timingSafeEqualHex(received, expected)) {
    return NextResponse.json(
      { status: 400, message: "Invalid responsesitesecurity." },
      { status: 400 }
    );
  }

  // Ensure we always include transfer_id if it was posted as a custom field.
  // (Backend expects transfer_id.)
  if (!flat["transfer_id"] && flat["orderreference"]) {
    const m = flat["orderreference"].match(/LF-(\d+)/i);
    if (m) flat["transfer_id"] = m[1];
  }

  return forwardToBackend(flat);
}

