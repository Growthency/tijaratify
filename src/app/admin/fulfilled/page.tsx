import { PageHead, NotConfiguredNotice } from "@/components/admin/AdminUI";
import { OrdersTable } from "@/components/admin/OrdersTable";
import { OrdersSetupNotice } from "@/components/admin/OrdersSetupNotice";
import { listOrders } from "@/lib/orders";

export const dynamic = "force-dynamic";

export default async function AdminFulfilledPage() {
  const { orders, setup } = await listOrders({ status: "delivered" });

  return (
    <div>
      <PageHead
        title="Fulfilled orders"
        description={
          setup === "ok"
            ? `${orders.length} delivered order${orders.length === 1 ? "" : "s"}, with full product and customer details.`
            : "Orders you mark as delivered appear here."
        }
      />
      {setup === "unconfigured" ? (
        <NotConfiguredNotice />
      ) : setup === "missing" ? (
        <OrdersSetupNotice />
      ) : (
        <OrdersTable orders={orders} view="fulfilled" />
      )}
    </div>
  );
}
