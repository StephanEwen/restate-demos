# Setup

The steps below need a backing account service running:

* Services: `cd mock_apis/svcs && ./gradlew run`
* Restate Server: `cd mock_apis && restate-server --config-file ./restate-conf.toml` starts a server at a different set of ports, so it does not conflict with any restate server with default settings running locally.

When executing inside `mock_apis`, the CLI will connect to the server with the ports as started above.
* Register via `restate dep add localhost:19080`

Watch the balances via
```
watch 'psql -h localhost -p 19071 -c "select service_name, service_key, key, value_utf8 from state where service_key='"'"'account'"'"' OR service_key='
"'"'RefundService'"'"' order by service_name, service_key, key;"'
```


# Steps

Start Restate Server via `cd restate-server && restate-server --config-file ./restate-conf.toml` to haf the Kafka Cluster endpoints configured.


## Part (1): Minimal "Hello World"

Run: `java/src/main/java/com/acme/part1/Hello.java`

Commands:

* `restate deployment add localhost:9080`
* `curl localhost:8080/Hello/helloWorld`
* `curl localhost:8080/Hello/greet --json '"Restate"'`

## Part (2): Simple multi-step function

Run: `java/src/main/java/com/acme/part2/Transactions.java`

Register: `restate deployment add localhost:9081`


(1) Make a transfer:
```
curl localhost:8080/txn/transfer --json '{
  "from": "100",
  "to": "200",
  "cents": 1000
}'
```

(2) Make a transfer that throws errors and see retries:
```
curl localhost:8080/txn/transfer --json '{
  "from": "100",
  "to": "800",
  "cents": 1000
}'
```

Also try `restate inv ls` and `restate inv get <id>`


(3) Show idempotentcy

Execute this multiple times
```
curl localhost:8080/txn/transfer -H 'idempotency-key: A' --json '{
  "from": "100",
  "to": "200",
  "cents": 1000
}'
```

(4) See a slow operations
curl localhost:8080/txn/transfer -H 'idempotency-key: B' --json '{
  "from": "100",
  "to": "500",
  "cents": 1000
}'

curl localhost:8080/txn/transfer/send -H 'idempotency-key: C' --json '{
  "from": "100",
  "to": "600",
  "cents": 1000
}'

curl localhost:8080/txn/transfer/send?delay=5s -H 'idempotency-key: D' --json '{
  "from": "100",
  "to": "200",
  "cents": 1000
}'

curl localhost:8080/txn/transfer --json '{
  "from": "100",
  "to": "200",
  "cents": 1337
}'


## Part (3): Fatal errors, handling errors

Run: `java/src/main/java/com/acme/part3/Transactions.java`

```
curl localhost:8080/txn/transfer -H 'idempotency-key: F' --json '{
  "from": "100",
  "to": "900",
  "cents": 1000
}'
```

## Part (4): Multi-level error handling, delays, cancellations

Run: `java/src/main/java/com/acme/part4/Transactions.java`

```
curl localhost:8080/txn/transfer -H 'idempotency-key: G' --json '{
  "from": "100",
  "to": "900",
  "cents": 1000
}'
```

Cancel handler while sleeping: `restate inv ls (optionally query)` and `restate inv cancel <id>`


## Part (4.2): Restate & Kafka

Create Kafka Cluster via `cd kafka && docker compose up`.

Create Kafka Suscription in Restate
```
curl localhost:9070/subscriptions --json '{
  "source": "kafka://my-cluster/txn",
  "sink": "service://txn/transfer",
  "options": {"auto.offset.reset": "latest"}
}'
```

Create a Kafka producer container:
```
docker run --rm -it --net=host confluentinc/cp-kafka:7.5.0 /bin/bash
```

Inside Kafka producer container run
```
kafka-console-producer --topic txn --bootstrap-server localhost:9092 --property "parse.key=true" --property "key.separator=|"
```

Enter test data like: `|{ "from": "100", "to": "200", "cents": 1000 }` (note that the `|` is important


## Part (5): Virtual Objects

Run: `java/src/main/java/com/acme/part5/Wire.java`

Show state on Objects
```
curl localhost:8080/Wire/abc/make --json '{
  "from": "250",
  "to": "260",
  "cents": 1000
}'

curl localhost:8080/Wire/abc/cancel

```

Show queuing on Objects by executing a mix of those commands concurrently (e.g., tmux)

```
curl localhost:8080/Wire/pqr/make --json '{
  "from": "500",
  "to": "100",
  "cents": 1000
}'

curl localhost:8080/Wire/pqr/cancel

curl localhost:8080/Wire/xyz/make --json '{
  "from": "250",
  "to": "260",
  "cents": 1000
}'
```


## Part (6): Workflows, Signals, Human-in-the-loop

Run: `java/src/main/java/com/acme/part6/TransferWorkflow.java`

```
curl localhost:8080/TransferWorkflow/XYZ/run --json '{
  "from": "310",
  "to": "320",
  "cents": 12000
}'

curl localhost:8080/TransferWorkflow/XYZ/checkAmount

curl localhost:8080/TransferWorkflow/XYZ/approve --json 'true'
```

