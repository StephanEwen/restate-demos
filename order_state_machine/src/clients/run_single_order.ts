
import { randomlySwitchingRegion, randomStickyRegion, stickyRegionByName } from "./regions";
import { randomScript, runSingleOrderProcess } from "./interactions";
import { ConsoleReporter } from "./output/output";

runSingleOrderProcess(randomScript(), randomlySwitchingRegion(), ConsoleReporter)
    .then(() => console.log("\n --- DONE! --- "))
    .catch((err) => console.error(err?.message));



