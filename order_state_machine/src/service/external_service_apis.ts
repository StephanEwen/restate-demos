import { TerminalError } from "@restatedev/restate-sdk";
import { sleep } from "../common/util";
import type { BookedOrder, EarmarkedOrder } from "../common/orders_types";

const ORDER_OP_DELAY = 1_000;
const TRANSIENT_ERROR_PROB = 0.05;
const FAILED_EARMARK_PROB = 0.0;
const FAILED_ORDER_PROB = 0.05;

export async function earmark(order: EarmarkedOrder): Promise<boolean> {
    await delay();
  
    maybeCauseTransientError();
  
    // sometimes, cannot reserve the ordered asset
    const success = Math.random() > FAILED_EARMARK_PROB;
    if (success) {
      console.log(" >>> Earmarked order " + JSON.stringify(order));
    } else {
      console.log(" >>> Could NOT earmark order " + JSON.stringify(order));
    }
    return success;
  }
  
  export async function releaseEarmark(order: EarmarkedOrder): Promise<true> {
    await delay();
  
    maybeCauseTransientError();

    console.log(" >>> Releasing earmark for order " + JSON.stringify(order));
  
    return true;
  }
  
  export async function bookOrder(
    order: EarmarkedOrder,
  ): Promise<BookedOrder> {
    const { reservationId, asset } = order;
  
    await delay();
  
    maybeCauseTransientError();
  
    if (Math.random() < FAILED_ORDER_PROB) {
      console.log(" >>> FAILED to book order " + JSON.stringify(order));
      throw new TerminalError(
        `Not possible to book order ${reservationId} (${asset?.quantity} or ${asset?.name})`,
      );
    }

    console.log(" >>> Booked order " + JSON.stringify(order) + " (and removed earmark)");
  
    return { orderId: reservationId, asset };
  }
  
  export async function reverseOrder(order: BookedOrder): Promise<true> {
    await delay();
  
    console.log(" >>> Reversed order " + JSON.stringify(order));
  
    return true;
  }

  function delay() {
    return sleep(ORDER_OP_DELAY + Math.random() * 100);
  }
  
  function maybeCauseTransientError() {
    if (Math.random() < TRANSIENT_ERROR_PROB) {
      throw new Error("Transient API error");
    }
  }