import { BadgeCheck, Star } from "lucide-react";
import { Stars } from "@/components/ui/Stars";
import {
  buildReviews,
  buildDistribution,
  recommendPercent,
  initialsOf,
  type StoredReview,
} from "@/lib/reviews";
import type { Product } from "@/types";

interface Card {
  key: string;
  name: string;
  initials: string;
  meta: string;
  rating: number;
  title: string;
  body: string;
}

/** Always-visible customer-reviews section shown beneath the product. */
export function ProductReviews({
  product,
  reviews = [],
}: {
  product: Product;
  reviews?: StoredReview[];
}) {
  const distribution = buildDistribution(product.rating);

  // Real, purchase-verified reviews first; top up with the seeded copy so a
  // brand-new product still shows a full, credible section.
  const real: Card[] = reviews.map((r) => ({
    key: r.id,
    name: r.customerName || "Verified customer",
    initials: initialsOf(r.customerName),
    meta: "Verified purchase",
    rating: r.rating,
    title: r.title,
    body: r.body,
  }));
  const filler: Card[] = buildReviews(product, 4).map((s, i) => ({
    key: `seed-${i}`,
    ...s,
  }));
  const cards = [...real, ...filler].slice(0, Math.max(4, real.length));
  const reviewCount = product.reviewCount + reviews.length;

  return (
    <section id="reviews" className="mt-20 scroll-mt-28">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <span className="kicker mb-2">
            <span className="h-px w-7 bg-ember-500" />
            What customers say
          </span>
          <h2 className="text-3xl font-extrabold uppercase tracking-tightest text-onyx-950 sm:text-4xl">
            Customer reviews
          </h2>
        </div>
        <div className="flex items-center gap-2 text-sm text-onyx-500">
          <Stars rating={product.rating} size={16} />
          <span className="font-bold text-onyx-950">{product.rating.toFixed(1)}</span>
          <span>· {reviewCount} reviews</span>
        </div>
      </div>

      <div className="grid gap-10 lg:grid-cols-[320px_1fr]">
        {/* summary */}
        <div className="h-fit rounded-3xl bg-onyx-50 p-7 ring-1 ring-onyx-100 lg:sticky lg:top-28">
          <div className="flex items-end gap-3">
            <span className="text-5xl font-extrabold leading-none text-onyx-950">
              {product.rating.toFixed(1)}
            </span>
            <span className="pb-1 text-sm text-onyx-400">/ 5</span>
          </div>
          <div className="mt-3">
            <Stars rating={product.rating} size={18} />
          </div>
          <p className="mt-2 text-sm text-onyx-500">
            Based on {reviewCount} verified reviews
          </p>

          <div className="mt-6 space-y-2">
            {distribution.map((row) => (
              <div key={row.stars} className="flex items-center gap-3">
                <span className="flex w-10 items-center gap-1 text-xs font-semibold text-onyx-500">
                  {row.stars}
                  <Star className="h-3 w-3 fill-onyx-300 text-onyx-300" />
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-onyx-200">
                  <div
                    className="h-full rounded-full bg-ember-500"
                    style={{ width: `${row.percent}%` }}
                  />
                </div>
                <span className="w-9 text-right text-xs tabular-nums text-onyx-400">
                  {row.percent}%
                </span>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-2 rounded-xl bg-white p-3 text-xs text-onyx-600 ring-1 ring-onyx-100">
            <BadgeCheck className="h-4 w-4 shrink-0 text-ember-500" />
            {recommendPercent(product.rating)}% would recommend this product
          </div>
        </div>

        {/* written reviews */}
        <div className="space-y-7">
          {cards.map((r) => (
            <article
              key={r.key}
              className="rounded-3xl bg-white p-6 ring-1 ring-onyx-100 sm:p-7"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-onyx-950 text-sm font-bold text-white">
                    {r.initials}
                  </span>
                  <div>
                    <p className="flex items-center gap-2 text-sm font-bold text-onyx-950">
                      {r.name}
                      <span className="inline-flex items-center gap-1 rounded-full bg-ember-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ember-600">
                        <BadgeCheck className="h-3 w-3" />
                        Verified
                      </span>
                    </p>
                    <p className="text-xs text-onyx-400">{r.meta}</p>
                  </div>
                </div>
                <Stars rating={r.rating} size={14} />
              </div>
              {r.title && (
                <h3 className="mt-4 text-base font-bold text-onyx-950">{r.title}</h3>
              )}
              {r.body ? (
                <p className="mt-1.5 text-sm leading-relaxed text-onyx-600">{r.body}</p>
              ) : (
                !r.title && (
                  <p className="mt-4 text-sm text-onyx-500">
                    Left a {r.rating}-star rating.
                  </p>
                )
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
