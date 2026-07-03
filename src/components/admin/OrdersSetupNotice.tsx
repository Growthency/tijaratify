import { AlertTriangle } from "lucide-react";

/**
 * Shown on the order screens when the `orders` tables don't exist yet. Points
 * the admin at the one-time SQL migration.
 */
export function OrdersSetupNotice() {
  return (
    <div
      className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"
      role="status"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold uppercase tracking-wide text-amber-900">
            One-time setup: create the order tables
          </p>
          <p className="mt-1 text-sm leading-relaxed text-amber-800/90">
            Orders can’t be saved until their database tables exist. Open your
            Supabase project → <strong>SQL Editor</strong>, paste the contents of{" "}
            <code className="rounded-md bg-white px-2 py-0.5 font-mono text-[12px] font-semibold text-amber-900 ring-1 ring-inset ring-amber-200">
              supabase/orders.sql
            </code>{" "}
            and run it once. Then place a test order and refresh this page.
          </p>
        </div>
      </div>
    </div>
  );
}
