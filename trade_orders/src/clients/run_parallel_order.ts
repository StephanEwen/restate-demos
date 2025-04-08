import { randomScript, runConcurrentOrderProcess } from "./interactions";
import { startSplitScreen } from "./output/split_parallel_output";

const { rootReporter, column1, column2 } = startSplitScreen();
rootReporter.clearOutput();

runConcurrentOrderProcess(
    randomScript(),
    {
        commonReporter: rootReporter,
        reporter1: column1,
        reporter2: column2
    })
    .then(() => console.log("\n --- DONE! --- "))
    .catch((err) => console.error(err?.message));



