# Consistency & Distributed Failover Example 

This example illustrates geo-distributed order processing system, where restate
is deployed across different regional endpoints (say in "us-east-1" and "us-west-1").
The illustrates and tests the consistency properties of both Restate's APIs and runtime.

Restate runs the order state machine and workflows that call the trading/inventory
APIs that reserve assets and book items *(you can conceptually also replace the
API calls with database operations)*. Restate's role is to maintain consistency
of the order state machine and the individual operations, like ensuring order items
always get earmarked and released correctly and that orders never end up in a partial state
between executed and canceled or failed - regardless of API failures, network issues,
process crashes, or regional outages.

The demo scenario is as follows:

```
                            #earmarkAssets()
                        +- addOrder() -+
                        |              |
                        v              |     #orderWorkflow()
 (NONE) ---- create() --+--> (OPEN) ---+------ close() ------> (FAILED) 
                                       |          |
                                       |          +----------> (CLOSED)
                                    cancel()                      |
                                       |#removeEarmark()          |
                                       |                       cancel()
                                   (CANCELED)                     |#reverseOrderWorkflow()
                                                                  V
                                                              (REVERSED)
```
* An order (with a specific ID) can be created.

* Order items can be added, in which cases the item's assets will be earmarked (reserved)
  by calling the inventory API. Earmarking can fail, in which case the order item is not added.

* The order can be executed, in which case all order items will be converted from earmarked to
  booked by running a workflow that calls the inventory API. 

* Order booking follows all-or-nothing semantics: The booking of any individual order
  item may fail (with a certain probability), in which case all other previously booked items
  in the order need to be released again.

* Orders may be canceled. If the order is canceled before executing it, only earmarks are
  be removed. If the order is cancelled after execution, the order is reversed (all item bookings
  are reversed).

The implementation contains the *order service* ([order_service.ts](./src/service/order_service.ts)),
a virtual object representing the order state machine, and two workflows which books the order
items ([book_orders_wf.ts](./src/service/book_orders_wf.ts)) and to reverse the booked order items
([reverse_orders_wf.ts](./src/service/reverse_orders_wf.ts))

## Consistency

The following operations are sensitive and rely on Restate's properties for a consistent
experience: 

* Adding order items, closing the order, or cancelling the order need to happen reliably
  once invoked, without relying on client retries.
* The `orderWorkflow` implements a SAGA, to ensure all-or-nothing semantics for booking
  the order items. The SAGA pattern only works correctly if completed steps are never lost,
  and cannot work under scenarios were state/journal-entries are asynchronously replicated
  and might thus be lost under failover.
* Operations are order- and concurrency-sensitive: For example, If different clients
  connected to different Restate endpoints (possibly different regions) and concurrently
  issue `close()` and `cancel()` calls, the system needs to persist, queue, and recover those
  calls in the reliably and in the same order in all regions, so that orders are consistently
  executed or reversed.
* Idempotency of requests: Operations like adding an order item should not create duplicate
  items if they are retried under failures. For example, if a request to add an order item to
  one endpoint fails with a connection error, and the client retries against another endpoint
  (another region), no duplication of items should happen.


## How to run the example

The example can be run with any Restate setup, inclusing a local single node setup.

This example shines when showcasing and testing the consistency of distributed setups.
Because Restate implements active-active replication, you can run this equally as a
distributed setup in one datacenter, or spread across multiple availability zones,
or even spread geographically across different regions (which is fun, because it works well!).

### Distributed Restate Setup

Create a local multi-node restate cluster and enter the URLs of the Restate servers
into the [regions file](./src/clients/regions.ts)

As of now (Nov 19th 2024) the full distributed setup has not been officially released.
Using distributed Restate requires building off the `main` branch of the
[Restate repo](https://github.com/restatedev/restate).
Bear in mind that many details, especially configuration and metastore setup are evolving
and updated frequently. The November community meeting contains a guide for creating such
a setup, but with the caveat that specific configurations may have evolved since then.

Reach out to us (Discord or 'code -at- restate.dev') if you want us to run a demo for you.

Check out [dev/README.md](dev/README.md) if you want a single node local setup to just
explore the example.


### Run the order service code 

Execute `npm run service` to start the [endpoint](./src/service/order_service.ts) that serves the `order` service, `makeOrders` workflow and the `reverseOrders` workflow.

Register the service at Restate server, for example using the CLI: `restate dep add localhost:9080`

### Run order sequences

Test individual sequences of creating order, adding items, executing/cancelling them by running
the scripts below. The scripts connect to [random region endpoints](./src/clients/regions.ts) and
issue requests against them, showing endpoint and responses, and automatically retry against
other regional endpoints when one is not reachable.

 * Run one order: `npm run order`
   
   This creates an order, add some random items, and either cancels, closes (executes),
   or closes followed by cancellation (reversal).
   The script picks one region to execute the order against.

 * Run orders in a loop: `npm run order-loop`.
   
   Similar as above, but you can also pass parameters "ALTERNATING" (to make every request within
   the same order to a different region) or pass the name of a sticky region (like "us-east-1").

 * Run concurrent order modifications: `npm run order-parallel`.

   This creates two clients against two endpoints (regions) that concurrently modify a single
   order. One will eventually attemp to execute the order, while the other one cancels the order.
   In all circumstances, the order items will be released. Depending on which request queues
   first, they will be cancelled directly, or first booked and the the booking gets reversed.

 * Spawn any number of such scripts in parallel to stress concurrency, isolation, reliability.

### Test Failures

Kill Restate instances (or connections/tunnels to them) at any point and observe how the
system maintains full consistency. Client's retry the operations, but will never duplicate
entries and will always consistently sort out order executions and cancellations.

Clients use the idempotency-key feature of Restate to avoid creating duplicates when re-trying
across different endpoints (regions) and otherwise rely on Restate linearizable state semantics
and Virtual Objects (single-writer, exactly-once state, virtual queues) to provide consistency.

It is worth mentioning that all that is logic is just few few lines of code in Restate, check
the [Order Service](./src/service/order_service.ts).
