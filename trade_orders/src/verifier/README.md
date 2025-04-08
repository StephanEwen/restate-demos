# External API services / Verifier

This package contains implementations of the inventory API (called by the order processing system).
The implementation verifies correct interaction from
the order processing system and act as a verification that the processing logic is
consistent.

These external APIs are implemented themselves as separate Restate Services, because
Restate makes it so simple to build correct stateful services.

### Running the verifying services

To run them, use the following steps:

* Bring up a Restate server. While you can reuse any running instance (like the one
  that order processing services use), the simplest way is to start a dedicated instance
  using the config in `src/verifier/restate-conf.toml`:
  `cd src/verifier && restate-server --config-file=./restate-conf.toml`

  To interact with that server, you can use the CLI from within `verifier` and 
  it will pick up the right admin port from the `.env` file.

* Start the asset inventory API: `npm run inventory-api`
* Register the services `restate dep add localhost:59080` or use the UI at `http://localhost:19070`
* Change the file `src/service/external_service_apis.ts` and replace
  `const mode: Mode = "MOCK";` with `const mode: Mode = "API";`.

### Verifying integrity

You can run the following SQL queries to test integrity:

**Show all assets / earmarks**

To show all assets and existing earmarks, run the following query. Upon completed orders, this
should never leave any earmarks.

The nicest experience is using Postgres' psql util, connecting to Restate's psql-wire-compatible endpoint.
```
psql -h localhost -p 19071 -c "select service_name, service_key, key, value_u
tf8 from state order by service_name, service_key, key;"

# or watch the result
watch -n 1 'psql -h localhost -p 19071 -c "select service_name, service_key, key, value_u
tf8 from state order by service_name, service_key, key;"'
```

If you miss psql, you can also use the Restate CLI
```
restate sql "select service_name, service_key, key, value_utf8 from state order by service_name, service_key, key;"
```

**Ensure no assets are lost/duplicated**

Run the following query, to ensure all available and sold assets add up to 100k by default.
Note that this is currently only correct when all orders are complete, because this does
not take earmarked assets into account, those would be missing from the total (see previous query).

```
psql -h localhost -p 19071 -c "select s1.service_name, s1.service_key, s1.value_utf8 as \"available\", s2.value_utf8 as \"sold\", s1.value_utf8 ::INT + s2.value_utf8 ::INT as \"total\" from state s1 JOIN state s2 ON s1.service_name = s2.service_name AND s1.service_key = s2.service_key WHERE s1.key = 'available' AND s2.key = 'sold' ORDER BY s1.service_name, s1.service_key;"

# or watch the result
watch -n 1 'psql -h localhost -p 19071 -c "select s1.service_name, s1.service_key, s1.value_utf8 as \"available\", s2.value_utf8 as \"sold\", s1.value_utf8 ::INT + s2.value_utf8 ::INT as \"total\" from state s1 JOIN state s2 ON s1.service_name = s2.service_name AND s1.service_key = s2.service_key WHERE s1.key = '"'"'available'"'"' AND s2.key = '"'"'sold'"'"' ORDER BY s1.service_name, s1.service_key;"'
```
