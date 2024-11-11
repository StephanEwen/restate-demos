package com.acme;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

import java.time.Duration;

@Service
public class Svc3 {

  @Handler
  public void doSomething(Context ctx) {
    ctx.sleep(Duration.ofMinutes(5));
  }
}
