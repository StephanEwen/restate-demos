import { randomElement } from "../common/util";

export type Region = {
    name: string,
    endpoint: string
}

// The regions and their endpoints. This is set to different local ports for
// a local multi-node setup.
// Replace this with the actual endpoints in case you run a proper distributed
// setup.
export const REGIONS: Region[] = [
    { name: "us-east-1", endpoint: "http://localhost:8080/" },
    { name: "us-west-1", endpoint: "http://localhost:8082/" }
]

if (REGIONS.length === 0) {
    throw new Error("Need at least one region");
}

export interface RegionSelector {
    getNextRegion(): Region;
    failover(): void;
}

export function randomStickyRegion(): RegionSelector {
    return stickyRegion(randomRegion());
}

export function stickyRegion(region: Region): RegionSelector {
    let currentRegion = region;
    return {
        getNextRegion: () => currentRegion,
        failover: () => { currentRegion = randomBackupRegion(currentRegion); }
    }
}

export function stickyRegionByName(name: string): RegionSelector {
    const region = REGIONS.find((r) => r.name === name);
    if (region) {
        return stickyRegion(region);
    }
    throw new Error("No region found with name: " + name);
}

export function randomlySwitchingRegion(): RegionSelector {
    let failoverRegion: Region | undefined = undefined;
    let lastRegion: Region | undefined = undefined;
    return {
        getNextRegion: () => failoverRegion ? failoverRegion : (lastRegion = randomRegion()),
        failover: () => { failoverRegion = randomBackupRegion(failoverRegion ?? lastRegion!); }
    }
}

export function randomRegion() {
    return randomElement(REGIONS);
}

export function randomBackupRegion(primaryRegion: Region): Region {
    if (primaryRegion === undefined) {
        throw new Error("undefined primary region when selecting backup");
    }

    const backupCandidates = REGIONS.filter((candidate) => candidate.name !== primaryRegion.name);
    if (backupCandidates.length === 0) {
        throw new Error("No other region available");
    }
    
    return randomElement(backupCandidates);
}