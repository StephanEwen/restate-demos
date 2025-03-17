import * as restate from "@restatedev/restate-sdk";
import { ObjectContext, ObjectSharedContext } from "@restatedev/restate-sdk";
import * as apis from "./external_service_apis";

import type { Asset, EarmarkedItem, BookedItem } from "../common/orders_types";
import type { OrderWorkflow } from "./exec_order_wf";
import type { OrderReversalWorkflow } from "./reverse_orders_wf";

const shared = restate.handlers.object.shared;

// ------------------------
// Bulk Order State Machine
// ------------------------
//
//                            #earmarkAssets()
//                        +- addOrder() -+
//                        |              |
//                        v              |     #orderWorkflow()
// (NONE) ---- create() --+--> (OPEN) ---+------ close() ------> (FAILED) 
//                                       |          |
//                                       |          +----------> (CLOSED)
//                                    cancel()                      |
//                                       |#removeEarmark()          |
//                                       |                       cancel()
//                                   (CANCELED)                     |#reverseOrder()
//                                                                  V
//                                                              (REVERSED)
//

// ----------------------------------------------------------------------------
//                              Order Service
// ----------------------------------------------------------------------------

export type OrderState = "NONE" | "OPEN" | "EXECUTED" | "CANCELED" | "FAILED" | "REVERSED" // main states
                | "CLOSED" | "REVERSING" // informational status states during transition

type State = {
  state: OrderState,
  pendingOrders: EarmarkedItem[],
  bookedOrders: BookedItem[]
  failure: string
}

export const orderService = restate.object({
  name: "bulkOrder",
  handlers: {

    /**
     * Open a new order. Only possible if this order did not exist before.
     */
    create: async (ctx: ObjectContext<State>) => {
      await requireState(ctx, "NONE");
      ctx.set("state", "OPEN");
    },

    /**
     * Adds one order item, earmarks the assets.
     */
    addOrder: async (ctx: ObjectContext<State>, asset: Asset) => {
      await requireState(ctx, "OPEN");

      const orderId = ctx.key;
      const orderItem = { reservationId: ctx.rand.uuidv4(), asset };
      const success = await ctx.run("earmark", () => apis.earmarkAssets(orderId, orderItem));
      if (!success) {
        return false;
      }

      const pending = (await ctx.get("pendingOrders")) || [];
      pending.push(orderItem);
      ctx.set("pendingOrders", pending);

      return true;
    },

    /**
     * Closes the order, booking all individual order items.
     */
    close: async (ctx: ObjectContext<State>): Promise<boolean> => {
      await requireState(ctx, "OPEN");
      ctx.set("state", "CLOSED");

      const pendingOrders = await ctx.get("pendingOrders");
      ctx.clear("pendingOrders");
      if (!pendingOrders) {
        ctx.set("state", "EXECUTED");
        return true;
      }
      
      // run actual order workflow
      const orderId = ctx.key;
      const workflowId = orderId; // use the order key as workflow id, for simplicity
      const { success, orders } = await ctx
          .workflowClient<OrderWorkflow>({ name: "makeOrders" }, workflowId)
          .run({ orderId, orders: pendingOrders } );

      if (success) {
        ctx.set("bookedOrders", orders);
        ctx.set("state", "EXECUTED");
        return true;
      } else {
        ctx.set("state", "FAILED");
        ctx.set("failure", "Order process failed");
        return false;
      }
    },

    /**
     * Cancels the order and either releases earmarks, or reverses order item bookings,
     * depending on whether the order was previously successfully closed and executed.
     */
    cancel: async (ctx: ObjectContext<State>): Promise<string> => {
      const state = (await ctx.get("state")) ?? "NONE";

      switch (state) {
        case "NONE":
          ctx.set("state", "CANCELED");
          return "NONE";

        case "CANCELED":
        case "FAILED":
        case "REVERSED":
          return state;
        
        case "OPEN": {
          // un-reserve and go to 'canceled'
          const pendingOrders = (await ctx.get("pendingOrders")) ?? []
          for (const order of pendingOrders) {
            await ctx.run("release earmark for " + order.reservationId, () => apis.releaseEarmark(order));
          }
          ctx.set("state", "CANCELED");
          break;
        }

        case "EXECUTED": {
          // undo the orders and go to 'reversed'
          ctx.set("state", "REVERSING");
          const bookedOrders = (await ctx.get("bookedOrders")) ?? [];

          await ctx
            .workflowClient<OrderReversalWorkflow>( { name: "reverseOrders" }, ctx.key)
            .run(bookedOrders);
          ctx.set("state", "REVERSED");
          break;
        }

        default:
          throw new restate.TerminalError(`Invalid state for aborting order: ${state}`);
      }

      ctx.clear("pendingOrders");
      ctx.clear("bookedOrders");

      return (await ctx.get("state")) ?? "NONE";
    },

    getStatus: shared(async (ctx: ObjectSharedContext<State>) => {
      return (await ctx.get("state")) ?? "NONE";
    }),

    getBookedOrders: shared(async (ctx: ObjectSharedContext<State>) => {
      return (await ctx.get("bookedOrders")) ?? [];
    }),

    getPendingOrders: shared(async (ctx: ObjectSharedContext<State>) => {
      return (await ctx.get("pendingOrders")) ?? [];
    }),

    reset: async (ctx: ObjectContext<State>) => {
      await requireState(ctx, "NONE", "EXECUTED", "CANCELED", "FAILED", "REVERSED");
      ctx.clearAll();
    }
  }
})

export type BulkOrderService = typeof orderService;

// ----------------------------------------------------------------------------
//                                 Utilities
// ----------------------------------------------------------------------------

async function requireState(ctx: ObjectSharedContext<State>, ...legalStates: OrderState[]) {
  const currentState = (await ctx.get("state") ?? "NONE");
  if (legalStates.includes(currentState)) {
    return;
  }

  throw new restate.TerminalError(
    `Order is not in any expected state ${JSON.stringify(legalStates)}, but in state ${currentState}`,
    { errorCode: 409 }
  );
}
