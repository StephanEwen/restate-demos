import * as restate from "@restatedev/restate-sdk"
import { batchedScannerService, scannerService } from "./ipScanner";

// The entrypoint for long-running processes / containers
restate
  .endpoint()
  .bind(scannerService)
  .bind(batchedScannerService)
  .listen(9080);