import Link from "next/link";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function pickFirst(v: string | string[] | undefined): string {
  if (!v) return "";
  return Array.isArray(v) ? v[0] || "" : v;
}

export default function TrustPaymentsReturnPage({ searchParams }: Props) {
  const errorcode = pickFirst(searchParams?.errorcode);
  const orderreference = pickFirst(searchParams?.orderreference);
  const status = errorcode === "0" ? "success" : "declined";

  return (
    <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-2xl border bg-card p-6 shadow-sm">
        <h1 className="text-lg font-semibold">
          {status === "success" ? "Payment Successful" : "Payment Not Completed"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {status === "success"
            ? "Your payment was received. You can return to the app."
            : "Your payment was not completed. You can return to the app and try again."}
        </p>
        {orderreference ? (
          <p className="mt-4 text-xs text-muted-foreground">
            Reference: <span className="font-mono">{orderreference}</span>
          </p>
        ) : null}
        <div className="mt-6 flex items-center justify-end gap-2">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center rounded-full border px-4 text-sm"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

