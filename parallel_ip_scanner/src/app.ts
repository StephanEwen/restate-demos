import * as restate from "@restatedev/restate-sdk";
import * as ip_Scan from "./ip_scanner";


const scannerService = restate.service({
  name: "ipScanner",
  handlers: { scanIp, scanOctetRangeParallel, scanIpRange }
})


async function scanIp(ctx: restate.Context, ip: string) {
  return ip_Scan.checkIpAddress(ip);
}


async function scanOctetRangeParallel(ctx: restate.Context, scanRange: ip_Scan.ScanRange) {
  // fan out the calls of all calls to a single scan
  const futures: restate.CombineablePromise<ip_Scan.ScanResult>[] = [];

  for (let octet = scanRange.range.from; octet <= scanRange.range.to; octet++) {
    const callFuture = ctx.serviceClient(scannerService).scanIp(scanRange.prefix + octet);
    futures.push(callFuture);
  }
  
  const results = await restate.CombineablePromise.all(futures);

  // keep only the non-clear results
  const vulnerables = results.filter((result) => result.status === "VULNERABLE");
  return vulnerables;
}


async function scanIpRange(ctx: restate.Context, range: ip_Scan.IpRange) {
  const client = ctx.serviceClient(scannerService);

  let vulnerables: ip_Scan.ScanResult[] = [];

  for (let a = range[0].from; a <= range[0].to; a++) {
    for (let b = range[1].from; b <= range[1].to; b++) {
      for (let c = range[2].from; c <= range[2].to; c++) {
        const prefix = `${a}.${b}.${c}.`;
        ctx.console.log("Scanning for prefix " + prefix);

        const results = await client.scanOctetRangeParallel({ prefix, range: range[3]});
        ctx.console.log("Found new vulnerable addresses " + JSON.stringify(results));

        vulnerables = vulnerables.concat(results);
      }
    }
  }

  return vulnerables;
}

// Create the Restate server to accept requests
restate
  .endpoint()
  .bind(scannerService)
  .listen(9080);
