package com.acme.part5;

import com.acme.apis.AccountApi;
import com.acme.part3.Transactions;
import com.acme.part6.TransferWorkflow;
import com.acme.types.PaymentStatus;
import com.acme.types.Transfer;
import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.StateKey;
import dev.restate.sdk.http.vertx.RestateHttpEndpointBuilder;

import java.util.UUID;

import static com.acme.types.PaymentStatus.*;
import static dev.restate.sdk.JsonSerdes.BOOLEAN;
import static dev.restate.sdk.JsonSerdes.STRING;
import static dev.restate.sdk.serde.jackson.JacksonSerdes.of;

@VirtualObject
public class Wire {


  private static final StateKey<PaymentStatus> STATUS =
        StateKey.of("status", of(PaymentStatus.class));

  private static final StateKey<Transfer> TRANSFER =
        StateKey.of("payment", of(Transfer.class));



  @Handler
  public String make(ObjectContext ctx, Transfer req) {
    PaymentStatus status = ctx.get(STATUS).orElse(NEW);
    if (status != NEW) {
      return status.toString();
    }
    ctx.set(TRANSFER, req);

    // --------------------------------------

    final String txnToken = ctx.run("idempotency token", STRING,
        () -> UUID.randomUUID().toString());

    boolean withdrawn = ctx.run("withdraw", BOOLEAN, () ->
        AccountApi.withdraw(req.from, req.cents, txnToken));

    if (!withdrawn) {
      ctx.set(STATUS, FAILED);
      return "FAILED";
    }

    ctx.run("deposit", () ->
       AccountApi.deposit(req.to, req.cents, txnToken));

    ctx.set(STATUS, COMPLETED_BEFORE);
    return "SUCCESS";
  }

  @Handler
  public String cancel(ObjectContext ctx) {
    PaymentStatus status = ctx.get(STATUS).orElse(NEW);
    ctx.set(STATUS, CANCELLED);

    if (status != COMPLETED_BEFORE) {
      return "CANCELLED";
    }

    // undo the payment
    Transfer req = ctx.get(TRANSFER).get();
    String txnToken = ctx.random().nextUUID().toString();

    ctx.run("charge", () ->
        AccountApi.withdraw(req.to, req.cents, txnToken));
    ctx.run("refund", () ->
        AccountApi.deposit(req.from, req.cents, txnToken));

    return "REVERSED";
  }



  public static void main(String[] args) {
    RestateHttpEndpointBuilder.builder()
        .bind(new Wire())
        .bind(new Transactions())
        .bind(new TransferWorkflow())
        .buildAndListen(9081);
  }
}
