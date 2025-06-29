import * as restate from "@restatedev/restate-sdk";
import { clear } from "console";

/*
 * types defining the state
 */
type EarmarkKey = `e_${string}`;
type OrderKey = `o_${string}`;
type EarmarkedAsset = { orderId: string, quantity: number };
type Earmarks = Record<EarmarkKey, EarmarkedAsset> // map: reservation-id -> { orderid, quantity}
type CompletedOrders = Record<OrderKey, number> // map: order-id -> { quantity}
type State = { available: number, sold: number } & Earmarks & CompletedOrders;

/*
 * types for request parameters
 */
type EarmarkRequest = EarmarkedAsset & { reservationId: string }
type BookRequest = { orderId: string, reservationId: string }

/*
 * constants
 */
const DEFAULT_QUANTITY = 1_000_000;
const EARMARK_EXPIRY_DELAY = 30 * 60 * 1000; // 30 minutes

/*
 * The inventory as a Virtual Object.
 *  - key is the asset name
 *  - state includes 'available', 'sold', as well as 'e_...' entries for earmarks and 'o_...' entries for orders.
 */
const assetInventoryService = restate.object({
    name: "assets",
    handlers: {

        earmark: async (ctx: restate.ObjectContext<State>, req: EarmarkRequest) => {
            typecheckEarmarkRequest(req);

            // check if this is a repeated request
            const existingEarmark = await ctx.get(earmarkKey(req.reservationId));
            if (existingEarmark) {
                return; // idempotent retry 
            }

            const available = await getAvailable(ctx);
            if (available < req.quantity) {
                // we throw this as an error, to make sure this bubbles up on the caller side
                throw new restate.TerminalError(`Not enough available, only ${available} left`, { errorCode: 400 });
            }

            // store earmark and new quantity
            ctx.set(earmarkKey(req.reservationId), earmarkedAssets(req));
            ctx.set("available", available - req.quantity);

            // schedule expiry of earmark
            ctx
                .objectSendClient(assetInventoryService, ctx.key, { delay: EARMARK_EXPIRY_DELAY })
                .releaseEarmark(req.reservationId);

            return true;
        },

        releaseEarmark: async (ctx: restate.ObjectContext<State>, reservationId: string) => {
            typecheckId(reservationId);

            const earmarked = await ctx.get(earmarkKey(reservationId));
            if (!earmarked) {
                return; // already expired, or idempotent retry 
            }

            ctx.clear(earmarkKey(reservationId));
            
            const available = await getAvailable(ctx);     
            ctx.set("available", available + earmarked.quantity);
        },

        markBooked: async (ctx: restate.ObjectContext<State>, req: BookRequest) => {
            typecheckBookRequest(req);

            // check if this is a repeated call for the same order
            const order = await ctx.get(orderKey(req.orderId));
            if (order) {
                return;
            }

            const earmarked = await ctx.get(earmarkKey(req.reservationId));
            if (!earmarked) {
                throw new restate.TerminalError(`Asset not earmarked under id: ${req.reservationId}`, { errorCode: 400 });
            }
            if (earmarked.orderId !== req.orderId) {
                throw new restate.TerminalError(`Asset earmarked for order ${req.reservationId} but for ${earmarked.orderId}`, { errorCode: 400 });
            }

            const sold = (await ctx.get("sold")) ?? 0;
            ctx.set("sold", sold + earmarked.quantity);

            ctx.set(orderKey(req.orderId), earmarked.quantity);
            ctx.clear(earmarkKey(req.reservationId))
        },

        revertOrder: async (ctx: restate.ObjectContext<State>, orderId: string) => {
            typecheckId(orderId);

            const orderQuantity = await ctx.get(orderKey(orderId));
            if (orderQuantity === null) {
                return; // was never executed, an undo for a request that never made it
            }

            const available = await getAvailable(ctx);
            const sold = (await ctx.get("sold")) ?? 0;

            ctx.set("sold", sold - orderQuantity);
            ctx.set("available", available + orderQuantity);
            ctx.clear(orderKey(orderId));
        },

        getAvailable: restate.handlers.object.shared(
            async (ctx: restate.ObjectSharedContext<State>) => {
                return getAvailable(ctx);
            }
        ),

        getEarmarks: restate.handlers.object.shared(
            async (ctx: restate.ObjectSharedContext) => {
                const keys = await ctx.stateKeys();
                const promises = keys.map(async (key) => {
                    return { mark: key, qty: await ctx.get(key) }
                });
                return Promise.all(promises);
            }
        ),
    }
})

export type AssetInventory = typeof assetInventoryService;

restate
    .endpoint()
    .bind(assetInventoryService)
    .listen(59080)

// --------------------------------------------------------
//  mist utils
// --------------------------------------------------------

async function getAvailable(ctx: restate.ObjectSharedContext<State>): Promise<number> {
    return (await ctx.get("available")) ?? DEFAULT_QUANTITY;
}

function earmarkKey(reservationId: string): EarmarkKey {
    return `e_${reservationId}`;
}

function orderKey(orderId: string): OrderKey {
    return `o_${orderId}`;
}

function earmarkedAssets(request: EarmarkRequest): EarmarkedAsset {
    return { orderId: request.orderId, quantity: request.quantity };
}

function typecheckId(id: string, idName = "argument id"): void {
    if (id === undefined) {
        throw new restate.TerminalError("argument id is undefined");
    }
    if (typeof id !== "string") {
        throw new restate.TerminalError("argument id is not a string");
    }
    if (id.length === 0) {
        throw new restate.TerminalError("argument id is empty");
    }
}

function typecheckQuantity(qty: number): void {
    if (qty === undefined) {
        throw new restate.TerminalError("quantity is undefined");
    }
    if (typeof qty !== "number") {
        throw new restate.TerminalError("quantity is not a number, but " + typeof qty);
    }
    if (qty === 0) {
        throw new restate.TerminalError("quantity is zero");
    }
}

function typecheckEarmarkRequest(req: EarmarkRequest) {
    if (!req || typeof req !== "object") {
        throw new restate.TerminalError("Request undefined or not object")
    }
    typecheckQuantity(req.quantity);
    typecheckId(req.orderId, "orderId");
    typecheckId(req.reservationId, "reservationId");
}

function typecheckBookRequest(req: BookRequest) {
    if (!req || typeof req !== "object") {
        throw new restate.TerminalError("Request undefined or not object")
    }
    typecheckId(req.orderId, "orderId");
    typecheckId(req.reservationId, "reservationId");
}
