import * as restate from "@restatedev/restate-sdk/lambda";
import { batchedScannerService, scannerService } from "./ipScanner";

// The entrypoint for AWS Lambda
export default restate
    .endpoint()
    .bind(scannerService)
    .bind(batchedScannerService)
    .handler();
