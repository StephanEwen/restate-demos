import { TerminalError } from "@restatedev/restate-sdk";
import { sleep } from "../common/util";
import type { BookedItem, EarmarkedItem } from "../common/orders_types";

// -----------------------------------------------------
//  The mode here is set to MOCK by default to make this
//  easily runnable. All calls to earmark assets,
//  book a sale, etc. are just dummy ops with artificial
//  delays in that case.
//
//  To run a backing asset inventory service that can
//  also verify consistency of the operations, take a
//  look at `dev/verifier`.
// -----------------------------------------------------

type Mode = "API" | "MOCK";
const mode: Mode = "MOCK"; 

// ---- external API params ----
// see <root>/dev/verifier for details
const APIS_BASE_URL = "http://localhost:18080";

// ---- mock call parameters ----
const MOCK_ORDER_OP_DELAY = 1_000;
const MOCK_TRANSIENT_ERROR_PROB = 0.05;
const MOCK_FAILED_EARMARK_PROB = 0.0;
const MOCK_FAILED_ORDER_PROB = 0.05;

export async function earmarkAssets(orderId: string, orderItem: EarmarkedItem): Promise<boolean> {
  let success: boolean;

  if (mode === "API") {
    const request = {
      orderId,
      quantity: orderItem.asset.quantity,
      reservationId: orderItem.reservationId
    }

    success = await makeApiCall(orderItem.asset.name, "earmark", request);
  } else {
    // mode === "MOCK"
    await delay();
    maybeCauseTransientError();
    // sometimes, cannot reserve the ordered asset
    success = Math.random() > MOCK_FAILED_EARMARK_PROB;
  }

  if (success) {
    console.log(" >>> Earmarked order " + JSON.stringify(orderItem));
  } else {
    console.log(" >>> Could NOT earmark order " + JSON.stringify(orderItem));
  }
  return success;
}

export async function releaseEarmark(orderItem: EarmarkedItem): Promise<true> {
  if (mode === "API") {
    const request = orderItem.reservationId;
    await makeApiCall(orderItem.asset.name, "releaseEarmark", request);
  } else {
    // mode === "MOCK"
    await delay();
    maybeCauseTransientError();
  }
  console.log(" >>> Releasing earmark for order " + JSON.stringify(orderItem));
  return true;
}

export async function bookOrderItem(orderId: string, orderItem: EarmarkedItem): Promise<BookedItem> {
  const { reservationId, asset } = orderItem;

  if (mode === "API") {
    const request = {
      orderId,
      reservationId: orderItem.reservationId
    }

    // this throws an exception if the booking fails
    await makeApiCall(asset.name, "markBooked", request);
  } else {
    // mode === "MOCK"
    await delay();

    maybeCauseTransientError();

    if (Math.random() < MOCK_FAILED_ORDER_PROB) {
      console.log(" >>> FAILED to book order " + JSON.stringify(orderItem));
      throw new TerminalError(
        `Not possible to book order ${reservationId} (${asset?.quantity} or ${asset?.name})`,
      );
    }
  }

  console.log(" >>> Booked order " + JSON.stringify(orderItem) + " (and removed earmark)");

  return { orderId: reservationId, asset };
}

export async function reverseOrderItem(orderItem: BookedItem): Promise<true> {
  if (mode === "API") {
    const request: number = orderItem.asset.quantity;
    await makeApiCall(orderItem.asset.name, "addBack", request);
  } else {
    // mode === "MOCK"
    await delay();
  }

  console.log(" >>> Reversed order " + JSON.stringify(orderItem));
  return true;
}

function delay() {
  return sleep(MOCK_ORDER_OP_DELAY + Math.random() * 100);
}

function maybeCauseTransientError() {
  if (Math.random() < MOCK_TRANSIENT_ERROR_PROB) {
    throw new Error("Transient API error");
  }
}

async function makeApiCall<T>(assetName: string, method: string, body: any): Promise<T> {
  const encodedName = encodeURIComponent(assetName);
  const url = `${APIS_BASE_URL}/assets/${encodedName}/${method}`;


try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errMessage = await response.text();
      throw new TerminalError(`Request failed (${response.status}): ${errMessage}`);
    }
    const responseText = await response.text();
    if (!responseText) {
      return undefined as T
    }

    const responseJson = JSON.parse(responseText);
    return responseJson as T;
  } catch (e: any) {
    if (e instanceof TerminalError) {
      throw e;
    }
    throw new TerminalError(`HTTP Request to ${url} failed: ${e.message}`, {cause: e});
  }
}