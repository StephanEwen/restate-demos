package com.acme.part6;

import com.acme.apis.AccountApi;
import com.acme.part3.Transactions;
import com.acme.part5.Wire;
import com.acme.types.Transfer;
import dev.restate.sdk.SharedWorkflowContext;
import dev.restate.sdk.WorkflowContext;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.Workflow;
import dev.restate.sdk.common.DurablePromiseKey;
import dev.restate.sdk.common.StateKey;
import dev.restate.sdk.common.TerminalException;
import dev.restate.sdk.http.vertx.RestateHttpEndpointBuilder;

import java.util.UUID;

import static dev.restate.sdk.JsonSerdes.*;

@Workflow
public class TransferWorkflow {

  private static final StateKey<Long> AMOUNT = StateKey.of("amount", LONG);

  private static final DurablePromiseKey<Boolean> APPROVED =
      DurablePromiseKey.of("approved", BOOLEAN);

  @Workflow
  public boolean run(WorkflowContext ctx, Transfer req) {

    final String txnToken = ctx.run("idempotency token", STRING,
          () -> UUID.randomUUID().toString());

    if (req.cents >= 10_000) {
      ctx.set(AMOUNT, req.cents);
      boolean approved = ctx.promise(APPROVED).awaitable().await();
      if (!approved) {
        return false;
      }
    }

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
          AccountApi.deposit(req.from, req.cents, refundToken));
      return false;
    }
  }

  @Shared
  public long checkAmount(SharedWorkflowContext ctx) {
    return ctx.get(AMOUNT).orElse(-1L);
  }

  @Shared
  public void approve(SharedWorkflowContext ctx, boolean approval) {
    ctx.promiseHandle(APPROVED).resolve(approval);
  }

  public static void main(String[] args) {
    RestateHttpEndpointBuilder.builder()
        .bind(new Wire())
        .bind(new Transactions())
        .bind(new TransferWorkflow())
        .buildAndListen(9081);
  }
}
