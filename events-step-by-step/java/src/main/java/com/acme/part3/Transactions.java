package com.acme.part3;

import com.acme.apis.AccountApi;
import com.acme.types.Transfer;
import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.common.TerminalException;

import java.util.UUID;

import static dev.restate.sdk.JsonSerdes.*;

@Service
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
      String refundToken = ctx.random().nextUUID().toString();
      ctx.run("refund", () ->
          AccountApi.enqueueRefundRequest(req.from, req.cents, refundToken));

      return false;
    }
  }
}