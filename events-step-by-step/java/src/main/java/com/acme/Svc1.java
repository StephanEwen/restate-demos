package com.acme;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

@Service
public class Svc1 {

  @Handler
  public void doSomething(Context ctx) {
    // work

    ctx.run("important stuff", () -> {});

    Svc2Client.fromContext(ctx).send().doSomething();
  }
}
