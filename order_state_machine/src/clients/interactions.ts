import { randomUUID } from "node:crypto";
import { randomElement, sleep } from "../common/util";
import { regionFailoverClient } from "./util/failover_client";
import { randomAsset } from "./util/testdata";
import { randomBackupRegion, randomRegion, stickyRegion, type RegionSelector } from "./regions";

import type { Asset, BookedItem, EarmarkedItem } from "../common/orders_types";
import type { BulkOrderService, OrderState } from "../service/order_service";
import type { Reporter } from "./output/output";

// ----------------------------------------------------------------------------
//                        Order Execution Script
// ----------------------------------------------------------------------------

const DEFAULT_DELAY = 1000; // 1 sec

export type Result = "EXECUTE" | "CANCEL" | "REVERSE"

export type Script = {
    numOrders: number,
    result: Result,
    stepDelayMs: number;
    getBetweenSteps?: boolean;
}

export function randomScript(): Script {
    const numOrders = Math.floor(Math.random() * 2) + 2;
    const possibleResults: Result[] = [ "EXECUTE", "CANCEL", "REVERSE"];
    const result = randomElement(possibleResults);

    return {
        numOrders,
        result,
        stepDelayMs: DEFAULT_DELAY
    }
}

// ----------------------------------------------------------------------------
//                        Single Order Processing
// ----------------------------------------------------------------------------

export async function runSingleOrderProcess(script: Script, region: RegionSelector, reporter: Reporter) {
    
    const bulkOrderId = randomUUID();

    const orderClient = regionFailoverClient<BulkOrderService>(
            { name: "bulkOrder"},
            bulkOrderId,
            { regionSelector: region, timeout: 10_000 },
        reporter);

    // Open Order
    reporter.msg(`Opening bulk order under ID ${bulkOrderId}...`)
    await orderClient.create();
    reporter.msg(`Order open.`).n();

    await delay(script);

    // Add some orders
    const addedOrders: Asset[] = [];
    for (let num = 1; num <= script.numOrders; num++) {
        const order = randomAsset();
        reporter.msg(`Adding order ${JSON.stringify(order)}`);
        const result = await orderClient.addOrder(order);
        if (result) {
            reporter.msg("Order item added.").n();
            addedOrders.push(order);
        } else {
            reporter.msg("Could could not earmark the required quantity, skippping order item.").n();
        }

        await delay(script);
    }

    reporter.msg(`Verifying that orders state is correct...`);
    expectOrders(await orderClient.getPendingOrders(), addedOrders);
    reporter.msg(`Orders state is correct.`).n();

    // finish up the order
    if (script.result !== "EXECUTE" && script.result !== "REVERSE" && script.result !== "CANCEL") {
        throw new Error("Unknown result action: " + script.result);
    }

    // cancel, if requested
    if (script.result === "CANCEL") {
        reporter.msg(`Cancelling bulk order on behalf of client...`);
        await orderClient.cancel();
        reporter.msg(`Cancellation of bulk order complete, all asset earmarks removed.`).n();

        reporter.msg(`Verifying that status is "CANCELED"`);
        expectOrderStatus(await orderClient.getStatus(), "CANCELED");

        reporter.msg(`Verifying consistency of state for pending and completed orders...`);
        expectOrders(await orderClient.getBookedOrders(), []);
        expectOrders(await orderClient.getPendingOrders(), []);
        return;
    }

    // try to execute order
    reporter.msg(`Closing and executing bulk order...`);
    const success = await orderClient.close();

    if (!success) {
        reporter.msg(`Bulk order failed, because one or more orders could not be executed.`).n();
        reporter.msg(`Verifying that order status is "FAILED"`);
        expectOrderStatus(await orderClient.getStatus(), "FAILED");

        reporter.msg(`Verifying consistency of state for pending and completed orders...`);
        expectOrders(await orderClient.getBookedOrders(), []);
        expectOrders(await orderClient.getPendingOrders(), []);
        return;
    }

    reporter.msg(`Successfully executed bulk order.`).n();

    reporter.msg(`Verifying that order status is "EXECUTED"`);
    expectOrderStatus(await orderClient.getStatus(), "EXECUTED");

    reporter.msg(`Verifying consistency of state for pending and completed orders...`);
    expectOrders(await orderClient.getBookedOrders(), addedOrders);
    expectOrders(await orderClient.getPendingOrders(), []);

    if (script.result !== "REVERSE") {
        // we are done!
        return;
    }

    await delay(script);

    // reverse order
    reporter.n().msg(`Cancelling order after execution - triggering reversal of orders...`);
    await orderClient.cancel();
    reporter.msg(`Cancelling with reversal complete.`).n();

    reporter.msg(`Verifying that order status is "REVERSED"`);
    expectOrderStatus(await orderClient.getStatus(), "REVERSED");

    reporter.msg(`Verifying consistency of state for pending and completed orders...`);
    expectOrders(await orderClient.getBookedOrders(), []);
    expectOrders(await orderClient.getPendingOrders(), []);
}

// ----------------------------------------------------------------------------
//                   Order Concurrently Processed by two clients
// ----------------------------------------------------------------------------

export async function runConcurrentOrderProcess(
    script: Script,
    reporters: {
        commonReporter: Reporter
        reporter1: Reporter,
        reporter2: Reporter
    }) {
 
    const { commonReporter, reporter1, reporter2 } = reporters;

    const bulkOrderId = randomUUID();
    const region1 = randomRegion();
    const region2 = randomBackupRegion(region1);

    const client1 = regionFailoverClient<BulkOrderService>(
            { name: "bulkOrder"},
            bulkOrderId,
            { regionSelector: stickyRegion(region1), timeout: 12_000 },
            reporter1);
    
    const client2 = regionFailoverClient<BulkOrderService>(
        { name: "bulkOrder"},
        bulkOrderId,
        { regionSelector: stickyRegion(region2), timeout: 12_000 },
        reporter2);

    // Open Order
    commonReporter.msg(`--- Opening bulk order under ID ${bulkOrderId}...`).n();
    
    const open1Done = client1.create().then(
            () => reporter1.msg("Order opened"),
            () => reporter1.msg("Order was already opened."),
    );
    const open2Done = client2.create().then(
        () => reporter2.msg("Order opened"),
        () => reporter2.msg("Order was already opened."),
    );
    await Promise.all([open1Done, open2Done]);

    await delay(script);

    commonReporter.msg("--- Adding order items.").n();
    
    await Promise.all([
        client1.addOrder(randomAsset()).then(() => reporter1.msg("Order item added.")),
        client2.addOrder(randomAsset()).then(() => reporter2.msg("Order item added."))
    ]);

    await delay(script);

    commonReporter.msg(`--- Checking orders state is correct...`).n();
    await Promise.all([
        client1.getPendingOrders().then((o) => reporter1.msg(JSON.stringify(o))),
        client2.getPendingOrders().then((o) => reporter2.msg(JSON.stringify(o)))
    ]);

    await delay(script);

    commonReporter.msg(`--- Closing the order...`).n();
    
    const [executer, execReporter] = Math.random() < 0.5 ? [client1, reporter1] : [client2, reporter2];
    const [canceller, cancelReporter] = executer === client1 ? [client2, reporter2] : [client1, reporter1];
    execReporter.msg("Attempting to execute order.");
    cancelReporter.msg("Cancelling order.");

    const execDone = executer.close().then(
        (result) => execReporter.msg(result ? "EXECUTED order" : "FAILED to execute order"),
        () => execReporter.msg("Order was already CANCELLED")
    );
    const cancelDone = canceller.cancel().then(
        (state) => cancelReporter.msg("Order was " + state)
    );
    await Promise.all([execDone, cancelDone]);

    // verify sequence of transitions

    commonReporter.msg(`--- Checking consistent state transitions...`).n();
    await Promise.all([
        client1.getStatus().then((o) => reporter1.msg("Status is " + o)),
        client2.getStatus().then((o) => reporter2.msg("Status is " + o))
    ]);

    commonReporter.n();
}

// ----------------------------------------------------------------------------
//                                 Utils
// ----------------------------------------------------------------------------

function expectOrderStatus(actual: OrderState, expected: OrderState): void {
    if (actual !== expected) {
        throw new Error(` !!!! Consistency violation !!!!  --- Expected status: ${expected} , actual status: ${actual}`);
    }
}

function expectOrders(actual: EarmarkedItem[] | BookedItem[], expected: Asset[]): void {
    if (actual.length !== expected.length) {
        throw new Error(` !!!! Consistency violation !!!!  --- Expected ${expected.length} orders, have ${actual.length} orders`);
    }

    for (let i = 0; i < actual.length; i++) {
        if (actual[i].asset.name !== expected[i].name || actual[i].asset.quantity !== expected[i].quantity) {
            throw new Error(` !!!! Consistency violation !!!!  --- Expected order: ${JSON.stringify(expected[i])} , actual order: ${JSON.stringify(actual[i].asset)}`);
        }
    }
}

async function delay(script: Script) {
    await sleep(script.stepDelayMs);
}
