package com.acme.backup;

import com.acme.apis.GreetingAPI;
import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;

import static dev.restate.sdk.JsonSerdes.STRING;

@Service
public class Hello {

  @Handler
  public String greet(Context ctx, String name) {
    String greeting = ctx.run("select", STRING, () -> {
      System.out.println("SELECTING GREETING");
      return GreetingAPI.selectGreeting();
    });

    String refinedGreeting = ctx.run("refine", STRING, () -> {
      System.out.println("REFINING GREETING");
      return GreetingAPI.refineGreeting(greeting);
    });

    return refinedGreeting + " " + name;
  }

  @Handler
  public String greet2(Context ctx, String name) {
    String greeting = ctx.run("select", STRING, () -> {
      System.out.println("SELECTING GREETING");
      return GreetingAPI.selectGreeting();
    });

    String refinedGreeting = ctx.run("refine", STRING, () -> {
      System.out.println("REFINING GREETING");
      return GreetingAPI.refineGreeting(greeting);
    });

    return refinedGreeting + " " + name;
  }
}




