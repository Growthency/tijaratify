import { PageHead, NotConfiguredNotice } from "@/components/admin/AdminUI";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { OrdersSetupNotice } from "@/components/admin/OrdersSetupNotice";
import { listOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const { orders, setup } = await listOrders();

  return (
    <div>
      <PageHead
        title="Orders"
        description={
          setup === "ok"
            ? `${orders.length} order${orders.length === 1 ? "" : "s"} — newest first. Change an order’s status to move it through fulfilment.`
            : "Every order placed at checkout lands here."
        }
      />
      {setup === "unconfigured" ? (
        <NotConfiguredNotice />
      ) : setup === "missing" ? (
        <OrdersSetupNotice />
      ) : (
        <OrdersTable orders={orders} view="all" />
      )}
    </div>
  );
}
