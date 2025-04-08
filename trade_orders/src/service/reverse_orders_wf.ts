import * as restate from "@restatedev/restate-sdk";
import { WorkflowContext } from "@restatedev/restate-sdk";

import * as apis from "./inventory_api";
import type { BookedItem } from "../common/types";


export const orderReversalWorkflow = restate.workflow({
  name: "reverseOrders",
  handlers: {
    run: async (ctx: WorkflowContext, orders: BookedItem[]) => {
      for (const o of orders) {
        await ctx.run("undo order " + o.orderId, () => apis.reverseOrderItem(o));
      }
    }
  }
})

export type OrderReversalWorkflow = typeof orderReversalWorkflow;
