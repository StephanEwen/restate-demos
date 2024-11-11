# Dev utils for developing and testing this example

### Proxy Servers

TYou can run a single node setup with three proxy servers instead of the distributed
setup. This lets one develop and debug the demo without setting up a distrinbuted
version of Restate, and simulate unreachable nodes by shutting down the respective proxies.

To simulate a three node setup:
 - Start the Restate server with the included config file: `cd local/rester-server && restate-server --config-file ./config.toml`. This makes Restate listen on port 8088. 
 - Start three proxy servers for ports 8080, 8081, 8082. For port 8080, use `node local/proxy.js 8080`. 


### Deno entry point

You can optionally run this example with Demo / Deno deploy.
You need to have Deno installed, see https://docs.deno.com/runtime/getting_started/installation/

Start the service via `deno run --unstable-sloppy-imports --allow-env --allow-net dev/deno_main.ts` and register the service at Restate Server.

Run the different order types:
 * Single order (random region): `deno run --allow-all --unstable-sloppy-imports ./src/clients/run_single_order.ts`
 * Order Loop: `deno run --allow-all --unstable-sloppy-imports ./src/clients/run_single_order_loop.ts`
 * Concurrent Order Access: `deno run --allow-all --unstable-sloppy-imports ./src/clients/run_parallel_order.ts`