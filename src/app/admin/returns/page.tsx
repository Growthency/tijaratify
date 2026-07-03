import { PageHead, NotConfiguredNotice } from "@/components/admin/AdminUI";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { OrdersSetupNotice } from "@/components/admin/OrdersSetupNotice";
import { listOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function AdminReturnsPage() {
  const { orders, setup } = await listOrders({ status: "returned" });

  return (
    <div>
      <PageHead
        title="Returns"
        description={
          setup === "ok"
            ? `${orders.length} returned order${orders.length === 1 ? "" : "s"}, with the customer and product details.`
            : "Orders you mark as returned appear here."
        }
      />
      {setup === "unconfigured" ? (
        <NotConfiguredNotice />
      ) : setup === "missing" ? (
        <OrdersSetupNotice />
      ) : (
        <OrdersTable orders={orders} view="returns" />
      )}
    </div>
  );
}
