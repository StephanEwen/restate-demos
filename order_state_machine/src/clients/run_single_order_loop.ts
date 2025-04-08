
import { randomlySwitchingEndpoint, randomStickyEndpoint, stickyEndpointByName, type EndpointSelector } from "./regions";
import { randomScript, runSingleOrderProcess } from "./interactions";
import { ConsoleReporter, type Reporter } from "./output/output";
import { sleep } from "../common/util";

const DELAY_BETWEEN_ORDERS = 2_000;

const region = process.argv[2] ?? "RANDOM_STICKY";
const regionSelector: () => EndpointSelector =
    region === "ALTERNATING"
        ? randomlySwitchingEndpoint
        : (region === "RANDOM_STICKY"
            ? randomStickyEndpoint
            : () => stickyEndpointByName(region));

async function runSingleOrderLoop() {
    const reporter: Reporter = ConsoleReporter;

    while (true) {
        const nextRegion = regionSelector();
        await runSingleOrderProcess(randomScript(), nextRegion, reporter)

        reporter.msg("\n ---------- DONE ---------");
        await sleep(DELAY_BETWEEN_ORDERS);
        reporter.clearOutput();
    }
}

runSingleOrderLoop()
    .then(() => console.log("\n --- DONE! --- "))
    .catch((err) => console.error(err?.message));



