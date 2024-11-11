package com.acme;

import com.acme.apis.GreetingAPI;
import dev.restate.sdk.SharedWorkflowContext;
import dev.restate.sdk.WorkflowContext;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.Workflow;
import dev.restate.sdk.common.DurablePromiseKey;

import static dev.restate.sdk.JsonSerdes.*;

@Workflow
public class HelloApproval {

  private static final DurablePromiseKey<Boolean> APPROVED =
      DurablePromiseKey.of("approved", BOOLEAN);


  @Workflow
  public String run(WorkflowContext ctx, String name) {

    String greeting = ctx.run("select", STRING, GreetingAPI::selectGreeting);

    String refinedGreeting = ctx.run("refine", STRING,
        () -> GreetingAPI.refineGreeting(greeting));

    boolean approved = ctx.promise(APPROVED).awaitable().await();
    if (!approved) {
      return "Sorry " + name + " they don't seem to like you!";
    }

    int count = HelloCounterClient.fromContext(ctx, name).inc().await();

    return String.format("%s %s for the %d-th time (approved)", refinedGreeting, name, count);
  }

  @Shared
  public void approve(SharedWorkflowContext ctx, boolean approval) {
    ctx.promiseHandle(APPROVED).resolve(approval);
  }
}
