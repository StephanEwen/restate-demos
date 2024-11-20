import * as restate from "@restatedev/restate-sdk";
import { WorkflowContext } from "@restatedev/restate-sdk";

import * as apis from "./external_service_apis";
import type { EarmarkedOrder, BookedOrder } from "../common/orders_types";


export const orderWorkflow = restate.workflow({
  name: "makeOrders",
  handlers: {
    run: async (ctx: WorkflowContext, orders: EarmarkedOrder[]) => {

      // sagas-style transaction that executes a sequence or orders
      // and undoes them, when not able to complete all orders
      const completedOrders: BookedOrder[] = [];
      try {
        for (const order of orders) {
          const bookedOrder = await ctx.run(
            "book order " + order.reservationId,
            () => apis.bookOrder(order)
          )
          completedOrders.push(bookedOrder);
        }
        return { success: true, orders: completedOrders };
      }
      catch (e) {
        if (e instanceof restate.TerminalError) {
          // sagas undo
          for (const o of completedOrders) {
            await ctx.run("undo order " + o.orderId, () => apis.reverseOrder(o))
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
