import { TerminalError } from "@restatedev/restate-sdk";

export type OctetRange = { from: number, to: number };
export type IpRange = [ OctetRange, OctetRange, OctetRange, OctetRange];
export type ScanStatus = "CLEAR" | "VULNERABLE"; 

export type ScanRange = {
    prefix: string,
    range: OctetRange
};

export type ScanResult = {
    ip: string,
    status: ScanStatus,
    details?: string
}

export async function checkIpAddress(ip: string): Promise<ScanResult> {
    // add an artificial delay, to simulate a "slow" scan
    await new Promise((resolve) => setTimeout(resolve, 500));
    return randomResult(ip);
}

export function parseIpRange(startIp: string, destIp: string): IpRange {
    const partsStart = startIp.split(".");
    const partsEnd = destIp.split(".");

    if (partsStart.length !== 4 || partsEnd.length !== 4) {
        throw new TerminalError(
            `Cannot pase start/end IP addresses, most be four parts each (${startIp} - ${destIp})`);
    }

    try {
        return [
            { from: Number(partsStart[0]), to: Number(partsEnd[0]) },
            { from: Number(partsStart[1]), to: Number(partsEnd[1]) },
            { from: Number(partsStart[2]), to: Number(partsEnd[2]) },
            { from: Number(partsStart[3]), to: Number(partsEnd[3]) }
        ]
    } catch (e: any) {
        throw new TerminalError(
            `Cannot pase start/end IP addresses (${startIp} - ${destIp}): ${e.message}`);
    }
}

// ----------------------------------------------------------------------------

const VULNERABILITY_RATE = 0.001;

function randomResult(ip: string): ScanResult {
    return Math.random() < VULNERABILITY_RATE
    ? { ip, status: "VULNERABLE", details: "found some exploit" }
    : { ip, status: "CLEAR" }
}