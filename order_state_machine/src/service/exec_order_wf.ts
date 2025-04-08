import * as restate from "@restatedev/restate-sdk";
import * as apis from "./inventory_api";
import type { EarmarkedItem, BookedItem } from "../common/types";


export const orderWorkflow = restate.workflow({
  name: "makeOrders",
  handlers: {

    run: async (ctx: restate.WorkflowContext, req: { orderId: string, orders: EarmarkedItem[] }) => {
      const { orderId, orders } = req;

      // sagas-style transaction that executes a sequence or orders
      // and undoes them, when not able to complete all orders
      const completedOrders: BookedItem[] = [];
      try {
        for (const order of orders) {
          // we remember this first, to avoid missing the undo in case of a failure
          completedOrders.push({ orderId, asset: order.asset });

          // call the API the order item
          await ctx.run("book item " + order.reservationId, () =>
            apis.bookOrderItem(orderId, order)
          );
        }

        return { success: true, orders: completedOrders };
      }
      catch (e) {
        if (e instanceof restate.TerminalError) {

          // sagas undo
          for (const o of completedOrders) {
            await ctx.run("undo order " + o.orderId, () => apis.reverseOrderItem(o))
          }

          return { success: false, orders: [] };
        } else {
          throw e;
        }
      }
    }
  }
})

export type OrderWorkflow = typeof orderWorkflow;
