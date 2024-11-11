package com.acme.part2;

import com.acme.apis.AccountApi;
import com.acme.types.Transfer;
import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.http.vertx.RestateHttpEndpointBuilder;

import java.util.UUID;

import static dev.restate.sdk.JsonSerdes.*;

@Service(name = "txn")
public class Transactions {

  @Handler
  public boolean transfer(Context ctx, Transfer req) {

    // step 1: create a persistent idempotency token
    String txnToken = ctx.run("idempotency token", STRING,
          () -> UUID.randomUUID().toString());

    // step 2: make 'withdraw' API call
    boolean withdrawn = ctx.run("withdraw", BOOLEAN,
        () -> AccountApi.withdraw(req.from, req.cents, txnToken));

    if (!withdrawn) {
      return false;
    }

    // step 3: make 'deposit' API call
    ctx.run("deposit", () ->
        AccountApi.deposit(req.to, req.cents, txnToken));
    return true;
  }

  public static void main(String[] args) {
    RestateHttpEndpointBuilder.builder()
        .bind(new Transactions())
        .buildAndListen(9081);
  }
}
