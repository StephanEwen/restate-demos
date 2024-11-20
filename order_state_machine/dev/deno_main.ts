import * as restate from "@restatedev/restate-sdk";
import { orderService } from "../src/service/order_service";
import { orderWorkflow } from "../src/service/book_orders_wf";
import { orderReversalWorkflow } from "../src/service/reverse_orders_wf";

// --------------------------------------------------------
//  This is the entry-point when hosting the application
//  via the Deno JavaScript runtime (e.g., on Deno deploy).
//
//  For the entrypoint for other runtimes (e.g., NodeJS, Bun)
//  see `stc/service/main.ts`.
// --------------------------------------------------------

const handler = restate
  .endpoint()
  .bind(orderService)
  .bind(orderWorkflow)
  .bind(orderReversalWorkflow)
  .bidirectional()
  .handler();

// deno run --watch --allow-env --allow-net src/service/deno_main.ts
Deno.serve({ port: 9080 }, handler.fetch);
