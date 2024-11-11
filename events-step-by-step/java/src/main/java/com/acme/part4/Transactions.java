package com.acme.part4;

import com.acme.apis.AccountApi;
import com.acme.types.Transfer;
import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.common.TerminalException;
import dev.restate.sdk.http.vertx.RestateHttpEndpointBuilder;

import java.time.Duration;
import java.util.UUID;

import static dev.restate.sdk.JsonSerdes.BOOLEAN;
import static dev.restate.sdk.JsonSerdes.STRING;

@Service(name = "txn")
public class Transactions {

  @Handler
  public boolean transfer(Context ctx, Transfer req) {

    final String txnToken = ctx.run("idempotency token", STRING,
          () -> UUID.randomUUID().toString());

    boolean withdrawn = ctx.run("withdraw", BOOLEAN, () ->
        AccountApi.withdraw(req.from, req.cents, txnToken));

    if (!withdrawn) {
      return false;
    }

    try {
      ctx.run("deposit", () ->
          AccountApi.deposit(req.to, req.cents, txnToken));
      return true;
    }
    catch (TerminalException e) {

      try {
        ctx.sleep(Duration.ofDays(1));

        ctx.run("deposit", () ->
            AccountApi.deposit(req.to, req.cents, txnToken));
        return true;
      }
      catch (TerminalException ee) {
        String refundToken = ctx.random().nextUUID().toString();
        ctx.run("refund", () ->
            AccountApi.enqueueRefundRequest(req.from, req.cents, refundToken));

        return false;
      }
    }
  }

  public static void main(String[] args) {
    RestateHttpEndpointBuilder.builder()
        .bind(new Transactions())
        .buildAndListen(9081);
  }
}
