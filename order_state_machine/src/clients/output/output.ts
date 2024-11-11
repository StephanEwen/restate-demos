import { RestateError } from "@restatedev/restate-sdk";
import type { Region } from "../regions.ts";
import chalk from "chalk";

export interface Reporter {
    msg(msg: string): Reporter;
    invocationStart(handler: string, region: Region): Reporter;
    connectionError(err: unknown): Reporter;
    invocationComplete(): Reporter;
    n(): Reporter;
    clearOutput(): Reporter;
}

export const ConsoleReporter: Reporter = {
    msg: (msg: string): Reporter => {
        console.log(msg);
        return ConsoleReporter;
    },
    invocationStart: (handler: string, region: Region): Reporter => {
        process.stdout.write(`Calling ${chalk.bold(chalk.blue(handler + "()"))} ----> ${chalk.magenta(region.name)} ----> `);
        return ConsoleReporter;
    },
    invocationComplete: (): Reporter => {
        process.stdout.write("✅\n");
        return ConsoleReporter;
    },
    connectionError: (err: unknown): Reporter => {
        process.stdout.write("❌\n");
        console.error(" -- Connection failed: " + errToString(err) + "\n");
        return ConsoleReporter;
    },
    n: (): Reporter => {
        console.log();
        return ConsoleReporter;
    },
    clearOutput: (): Reporter => {
        console.clear();
        return ConsoleReporter;
    }
} satisfies Reporter;

// ------------------- utils -------------------

export function errToString(err: unknown): string {
    if (err instanceof RestateError) {
        return `(${err.code}) : ${err.message}`;
    }
    if (err instanceof Error) {
        return String(err.message);
    }
    return String(err);
}
