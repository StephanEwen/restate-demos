package com.acme;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

import static dev.restate.sdk.JsonSerdes.*;

@Service
public class Svc2 {

  @Handler
  public void doSomething(Context ctx) {
    // work

    ctx.run("important stuff", () -> {});

    Svc3Client.fromContext(ctx).send().doSomething();
  }
}
