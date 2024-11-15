import { sleep } from "./utils";

export type OctetRange = { from: number, to: number };
export type IpRange = [ OctetRange, OctetRange, OctetRange, OctetRange];
export type ScanRange = { prefix: string, range: OctetRange };

// ----------------------------------------------------------------------------

export type ScanStatus = "CLEAR" | "VULNERABLE"; 

export type ScanResult = {
    ip: string,
    status: ScanStatus,
    details?: string
}

export async function checkIpAddress(ip: string): Promise<ScanResult> {
    await sleep(500);
    return randomResult(ip);
}

// ----------------------------------------------------------------------------

const VULNERABILITY_RATE = 0.001;

function randomResult(ip: string): ScanResult {
    return Math.random() < VULNERABILITY_RATE
    ? { ip, status: "VULNERABLE", details: "found some exploit" }
    : { ip, status: "CLEAR" }
}