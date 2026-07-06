import { pageMetadata } from "@/lib/seo";
import { OrdersLookupClient } from "@/components/commerce/OrdersLookupClient";

export const metadata = pageMetadata({
  title: "My Orders",
  description: "Track your orders, cancel an order, or review what you've bought.",
  path: "/orders",
  noindex: true,
});

export default function OrdersPage() {
  return <OrdersLookupClient />;
}
