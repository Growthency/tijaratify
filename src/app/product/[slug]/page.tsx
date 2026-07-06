import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import { Container } from "@/components/ui/Container";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductPurchase } from "@/components/product/ProductPurchase";
import { ProductTabs } from "@/components/product/ProductTabs";
import { ProductReviews } from "@/components/product/ProductReviews";
import {
  getProduct,
  getProducts,
  getRelatedProducts,
} from "@/lib/queries";
import { listReviews } from "@/lib/reviews-store";
import { siteConfig } from "@/config/site";
import { pageMetadata, breadcrumbLd, absoluteUrl } from "@/lib/seo";
import { JsonLd } from "@/components/seo/JsonLd";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// ISR: stay static but refresh price/availability/metadata hourly.
export const revalidate = 3600;

export async function generateStaticParams() {
  const products = await getProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: "Product not found" };

  return pageMetadata({
    title: product.name,
    description: product.shortDescription,
    path: `/product/${product.slug}`,
    keywords: [product.name, product.categoryName, ...product.tags].filter(Boolean),
  });
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  const [related, reviews] = await Promise.all([
    getRelatedProducts(product, 4),
    listReviews(product.slug),
  ]);

  // Product schema for rich results.
  const productUrl = absoluteUrl(`/product/${product.slug}`);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: product.name,
    image: product.images.map((i) => (i.startsWith("http") ? i : absoluteUrl(i))),
    description: product.shortDescription,
    sku: product.id,
    url: productUrl,
    brand: { "@type": "Brand", name: siteConfig.name },
    // Only emit aggregateRating once there are real reviews — an empty rating
    // is invalid schema and triggers Google rich-result errors.
    ...(product.reviewCount > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: product.rating,
            reviewCount: product.reviewCount,
          },
        }
      : {}),
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency,
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: productUrl,
    },
  };

  return (
    <div className="bg-bone">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <JsonLd data={breadcrumbLd([
        { name: "Home", path: "/" },
        { name: "Shop", path: "/shop" },
        { name: product.categoryName, path: `/category/${product.categorySlug}` },
        { name: product.name, path: `/product/${product.slug}` },
      ])} />

      <Container className="py-7">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Shop", href: "/shop" },
            { label: product.categoryName, href: `/category/${product.categorySlug}` },
            { label: product.name },
          ]}
        />
      </Container>

      {/* main */}
      <Container className="pb-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-14">
          <ProductGallery
            images={product.images}
            name={product.name}
            badge={product.badge}
          />

          <div className="lg:sticky lg:top-24 lg:self-start">
            <ProductPurchase product={product} />
          </div>
        </div>

        <ProductTabs product={product} />

        <ProductReviews product={product} reviews={reviews} />
      </Container>

      {/* related */}
      {related.length > 0 && (
        <section className="border-t border-onyx-100 bg-white">
          <Container className="py-16 lg:py-20">
            <div className="mb-9 flex items-end justify-between gap-4">
              <div>
                <span className="kicker mb-2">
                  <span className="h-px w-7 bg-ember-500" />
                  More to love
                </span>
                <h2 className="text-3xl font-extrabold uppercase tracking-tightest text-onyx-950 sm:text-4xl">
                  You may also like
                </h2>
              </div>
              <Link
                href={`/category/${product.categorySlug}`}
                className="hidden items-center gap-1.5 text-sm font-semibold text-onyx-900 transition-colors hover:text-ember-600 sm:inline-flex"
              >
                Shop all {product.categoryName}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-x-5 gap-y-9 md:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </Container>
        </section>
      )}
    </div>
  );
}
