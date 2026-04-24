import crypto from "node:crypto";

type FormValues = Record<string, string[]>;

export type TrustPaymentsParseResult = {
  values: FormValues;
  flat: Record<string, string>;
};

export const TRUST_PAYMENTS_RESPONSE_EXCLUDE_FIELDS = new Set([
  "notificationreference",
  "responsesitesecurity",
]);

export function parseFormData(formData: FormData): TrustPaymentsParseResult {
  const values: FormValues = {};

  for (const [key, value] of formData.entries()) {
    // Ignore non-string values; Trust Payments notifications are scalar fields.
    if (typeof value !== "string") continue;
    if (!values[key]) values[key] = [];
    values[key].push(value);
  }

  const flat: Record<string, string> = {};
  for (const [key, arr] of Object.entries(values)) {
    flat[key] = arr.join("");
  }

  return { values, flat };
}

export function computeResponseSiteSecurity(
  values: FormValues,
  password: string
): string {
  const keys = Object.keys(values)
    .filter((k) => !TRUST_PAYMENTS_RESPONSE_EXCLUDE_FIELDS.has(k))
    .sort(); // ASCII/alphabetical

  let input = "";
  for (const key of keys) {
    const parts = values[key] ?? [];
    // Multiple values are concatenated in the order submitted.
    for (const part of parts) input += part;
  }
  input += password;

  return crypto.createHash("sha256").update(input, "utf8").digest("hex");
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  const aa = Buffer.from(a.toLowerCase(), "utf8");
  const bb = Buffer.from(b.toLowerCase(), "utf8");
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

