import * as restate from "@restatedev/restate-sdk";
import { WorkflowContext } from "@restatedev/restate-sdk";

import * as apis from "./external_service_apis";
import type { BookedOrder } from "../common/orders_types";


export const orderReversalWorkflow = restate.workflow({
  name: "reverseOrders",
  handlers: {
    run: async (ctx: WorkflowContext, orders: BookedOrder[]) => {
      for (const o of orders) {
        await ctx.run("undo order " + o.orderId, () => apis.reverseOrder(o));
      }
    }
  }
})

export type OrderReversalWorkflow = typeof orderReversalWorkflow;
