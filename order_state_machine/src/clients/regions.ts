import { randomElement } from "../common/util";

export type Endpoint = {
    name: string,
    address: string
}

// The endpoints This can be set to different distributed nodes or regions,
// or to different local ports for a local multi-node setup.
// Replace this with the actual endpoints in case you run a proper distributed
// setup.
export const ENDPOINTS: Endpoint[] = [
    { name: "node-1", address: "http://localhost:8080/" },
    { name: "node-2", address: "http://localhost:28080/" },
    { name: "node-3", address: "http://localhost:38080/" },
]

if (ENDPOINTS.length === 0) {
    throw new Error("Need at least one endpoint");
}

export interface EndpointSelector {
    getNextEndpoint(): Endpoint;
    failover(): void;
}

export function randomStickyEndpoint(): EndpointSelector {
    return stickyEndpoint(randomEndpoint());
}

export function stickyEndpoint(endpoint: Endpoint): EndpointSelector {
    let currentEndpoint = endpoint;
    return {
        getNextEndpoint: () => currentEndpoint,
        failover: () => { currentEndpoint = randomBackupEndpoint(currentEndpoint); }
    }
}

export function stickyEndpointByName(name: string): EndpointSelector {
    const endpoint = ENDPOINTS.find((r) => r.name === name);
    if (endpoint) {
        return stickyEndpoint(endpoint);
    }
    throw new Error("No endpoint found with name: " + name);
}

export function randomlySwitchingEndpoint(): EndpointSelector {
    let failoverEndpoint: Endpoint | undefined = undefined;
    let lastEndpoint: Endpoint | undefined = undefined;
    return {
        getNextEndpoint: () => failoverEndpoint ? failoverEndpoint : (lastEndpoint = randomEndpoint()),
        failover: () => { failoverEndpoint = randomBackupEndpoint(failoverEndpoint ?? lastEndpoint!); }
    }
}

export function randomEndpoint() {
    return randomElement(ENDPOINTS);
}

export function randomBackupEndpoint(primaryEndpoint: Endpoint): Endpoint {
    if (primaryEndpoint === undefined) {
        throw new Error("undefined primary endpoint when selecting backup");
    }

    const backupCandidates = ENDPOINTS.filter((candidate) => candidate.name !== primaryEndpoint.name);
    if (backupCandidates.length === 0) {
        throw new Error("No other endpoint available");
    }
    
    return randomElement(backupCandidates);
}