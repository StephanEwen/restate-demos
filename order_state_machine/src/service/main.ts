import * as restate from "@restatedev/restate-sdk";
import { orderService } from "./order_service";
import { orderWorkflow } from "./exec_order_wf";
import { orderReversalWorkflow } from "./reverse_orders_wf";

// --------------------------------------------------------
//  Main entrypoint for the order processing service.
//  Start this directly or via `npm run service`
// --------------------------------------------------------

restate.endpoint()
  .bind(orderService)
  .bind(orderWorkflow)
  .bind(orderReversalWorkflow)
  .listen(9080);
