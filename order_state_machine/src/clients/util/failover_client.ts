// deno-lint-ignore-file no-explicit-any
import * as restate from "@restatedev/restate-sdk-clients";
import { Endpoint, EndpointSelector } from "../regions";
import { sleep, withTimeout } from "../../common/util";
import { ConsoleReporter, Reporter } from "../output/output";
import { randomUUID } from "node:crypto";

// redeclare inaccessible definition of VirtualObject
// this should be made accessible in the Restate SDK
type VirtualObject<M> = M extends restate.VirtualObjectDefinition<string, infer O> ? O : never;

const DEFAULT_MAX_ATTEMPTS = 20;
const DEFAULT_RETRY_DELAY = 500;

export function regionFailoverClient<D>(
        opts: restate.VirtualObjectDefinitionFrom<D>,
        key: string,
        connectionProps: {
            regionSelector: EndpointSelector,
            timeout: number,
            maxAttempts?: number,
            retryDeplay?: number
        },
        reporter?: Reporter): restate.IngressClient<VirtualObject<D>> {

    const {
        regionSelector,
        timeout,
        maxAttempts = DEFAULT_MAX_ATTEMPTS,
        retryDeplay = DEFAULT_RETRY_DELAY
    } = connectionProps;

    reporter ??= ConsoleReporter;

    const makeCall = (region: Endpoint, handler: string | symbol, args: any[]) => {
        reporter.invocationStart(String(handler), region);
    
        const client = restate
            .connect( { url: region.address } )
            .objectClient<D>(opts, key) as any;
        
        const resultPromise = client[handler](...args) as Promise<any>;
        return withTimeout(resultPromise, timeout);
    }

    const proxyClient = new Proxy({}, {
        get: (_target, prop) => {
            const handler = prop;
            return async (...args: any) => {
                const idempotencyKey = randomUUID();
                const argsWithKey = addIdempotencyKey(idempotencyKey, args);

                for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                    try {
                        const region = regionSelector.getNextEndpoint();
                        const result = await makeCall(region, handler, argsWithKey);
                        reporter.invocationComplete();
                        return result;
                    } catch (err) {
                        if (err instanceof restate.HttpCallError) {
                            reporter.invocationComplete();
                            throw err;
                        }
                        reporter.connectionError(err);
                    }

                    regionSelector.failover();
                    await sleep(retryDeplay);
                }

                throw new Error(`Request to ${String(handler)} failed after ${maxAttempts} retries.`);
            };
        },
    });

    return proxyClient as restate.IngressClient<VirtualObject<D>>;
}

function addIdempotencyKey(idempotencyKey: string, args: any[]): any[] {
    const optsWithKey = restate.Opts.from({ idempotencyKey });

    switch (args.length) {
        case 0: {
          return [ optsWithKey ];
        }
        case 1: {
          if (args[0] instanceof restate.SendOpts || args[0] instanceof restate.Opts) {
            throw new Error("Not implemented: Adding an idempotency key to invocations that already have Opts/SendOpts");
          }

          return [ args[0], optsWithKey ];
        }
        case 2: {
            throw new Error("Not implemented: Adding an idempotency key to invocations that already have Opts/SendOpts");
        }
        default: {
          throw new TypeError("unexpected number of arguments");
        }
      }    
}