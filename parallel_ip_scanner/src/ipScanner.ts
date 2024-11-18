import * as restate from "@restatedev/restate-sdk";
import { ScanRange, ScanResult, checkIpAddress, parseIpRange } from "./ips";

/*
 * The scanner Restate service that scans IP range.
 * Because all invocations and RPCs are durable, this implementationautomatically
 * revovers failures from the last completed call and doesn't redo already completed
 * parts.
 *
 * The implementation parallelizes the scans of the last octet (like 8.8.8.0 - 8.8.8.255)
 * and otherwise sequentially iterates over the address range, to avoid creating a massive
 * parallel request storm. 
 * 
 * This version creates one durable invocation per IP address to scan. If that would
 * be considered too expensive (because fo invocation cost, if running on FaaS), it would
 * be an easy modification make an invocation per batch of addresses.
 *
 * Invoke this for example by passing `{ "from": "10.8.10.0", "to": "10.9.12.255" }` as the
 * argument.
 */
export const scannerService = restate.service({
  name: "ipScanner",
  handlers: {
    
    /**
     * Checks a single IP address.
     */
    scanIp: async (ctx: restate.Context, ip: string) => {
      return checkIpAddress(ip);
    },
    
    /*
     * Checks a range of addresses which have  (e.g., 10.1.4.33 - 10.1.4.49) in parallel.
     */
    scanOctetRangeParallel: async (ctx: restate.Context, scan: ScanRange) => {
      // fan out all the calls for a single IP address check by calling the 
      // 'scanIp' function but not awaiting the result, and then awaiting all of
      // them together 

      // (1) call the 'scanIp' function and collect result promises
      const futures: restate.CombineablePromise<ScanResult>[] = [];
      for (let octet = scan.range.from; octet <= scan.range.to; octet++) {
        const callFuture = ctx.serviceClient(scannerService).scanIp(scan.prefix + octet);
        futures.push(callFuture);
      }

      // (2) await all the resuls together
      const results = await restate.CombineablePromise.all(futures);
    
      // keep only the vulnerable results
      const vulnerables = results.filter((result) => result.status === "VULNERABLE");
      return vulnerables;
    },
    
    /**
     * The main entrypoint function to scan an address range.
     * The implementation sequentially iterates over the first three octet ranges,
     * parallelizes the scans of the last octet (like 10.8.8.0 - 10.8.8.255). 
     */
    scanIpRange: async (ctx: restate.Context, ipRange: { from: string, to: string}) => {
      const range = parseIpRange(ipRange.from, ipRange.to);
      let vulnerables: ScanResult[] = [];

      for (let a = range[0].from; a <= range[0].to; a++) {
        for (let b = range[1].from; b <= range[1].to; b++) {
          for (let c = range[2].from; c <= range[2].to; c++) {
            const prefix = `${a}.${b}.${c}.`;
            ctx.console.log("Scanning for prefix " + prefix);

            const results = await ctx
                .serviceClient(scannerService)
                .scanOctetRangeParallel({ prefix, range: range[3]});

            ctx.console.log("Found new vulnerable addresses " + JSON.stringify(results));
            vulnerables = vulnerables.concat(results);
          }
        }
      }

      return vulnerables;
    }
  }
});

export type ScannerService = typeof scannerService;

/*
 * Another version of the scanner Restate service that scans IP range.
 *
 * This implementation differes from the implementation .
 * 
 * Invoke this for example by passing `{ "from": "8.8.10.0", "to": "8.9.12.255" }` as the
 * argument.
 */
export const batchedScannerService = restate.service({
  name: "batchedIpScanner",
  handlers: {
    
    /**
     * Checks a batch of IP addresses.
     */
    scanIpBatch: async (ctx: restate.Context, ips: string[]): Promise<ScanResult[]> => {
      let vulnerables: ScanResult[] = [];
    
      for (const ip of ips) {
        const result = await checkIpAddress(ip);
        if (result.status === "VULNERABLE") {
          vulnerables.push(result);
        }
      }
      return vulnerables;
    },
    
    /*
     * Checks a range of addresses (e.g., 10.1.4.33 - 10.1.4.49) in parallel,
     * dispatching batched of addresses to 'scanIpBatch'.
     */
    scanOctetRangeParallel: async (ctx: restate.Context, scan: ScanRange) => {
      const futures: restate.CombineablePromise<ScanResult[]>[] = [];
      const { prefix, range } = scan;
      const batchSize = 10;

      while (range.from <= range.to) {
        const addresses: string[] = [];
        for (let i = 0; i < batchSize && range.from <= range.to; i++) {
          addresses.push(prefix + range.from);
          range.from++;
        }

        const future = ctx.serviceClient(batchedScannerService).scanIpBatch(addresses);
        futures.push(future);
      }

      // (2) await all the resuls together
      const results = (await restate.CombineablePromise.all(futures)).flat();
    
      // keep only the vulnerable results
      const vulnerables = results.filter((result) => result.status === "VULNERABLE");
      return vulnerables;
    },
    
    scanIpRange: async (ctx: restate.Context, ipRange: { from: string, to: string}) => {
      const range = parseIpRange(ipRange.from, ipRange.to);
      let vulnerables: ScanResult[] = [];

      for (let a = range[0].from; a <= range[0].to; a++) {
        for (let b = range[1].from; b <= range[1].to; b++) {
          for (let c = range[2].from; c <= range[2].to; c++) {
            const prefix = `${a}.${b}.${c}.`;
            ctx.console.log("Scanning for prefix " + prefix);

            const results = await ctx
                .serviceClient(batchedScannerService)
                .scanOctetRangeParallel({ prefix, range: range[3] });

            ctx.console.log("Found new vulnerable addresses " + JSON.stringify(results));
            vulnerables = vulnerables.concat(results);
          }
        }
      }

      return vulnerables;
    }
  }
})

export type BatchScannerService = typeof batchedScannerService;