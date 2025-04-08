
import { randomlySwitchingEndpoint, randomStickyEndpoint, stickyEndpointByName } from "./regions";
import { randomScript, runSingleOrderProcess } from "./interactions";
import { ConsoleReporter } from "./output/output";

runSingleOrderProcess(randomScript(), stickyEndpointByName("client-1"), ConsoleReporter)
    .then(() => console.log("\n --- DONE! --- "))
    .catch((err) => console.error(err?.message));



