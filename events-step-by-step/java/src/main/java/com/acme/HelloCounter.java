package com.acme;

import com.acme.apis.GreetingAPI;
import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.SharedObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Shared;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.StateKey;

import java.time.Duration;

import static dev.restate.sdk.JsonSerdes.*;

@VirtualObject
public class HelloCounter {

  private static final StateKey<Integer> COUNT = StateKey.of("count", INT);
  private static final StateKey<String> HISTORY = StateKey.of("hist", STRING);

  @Handler
  public String greet(ObjectContext ctx, String message) {
    String greeting = ctx.run("select", STRING, () -> {
      System.out.println("SELECTING GREETING");
      return GreetingAPI.selectGreeting();
    });

    String refinedGreeting = ctx.run("refine", STRING, () -> {
      System.out.println("REFINING GREETING");
      return GreetingAPI.refineGreeting(greeting);
    });

    int count = ctx.get(COUNT).orElse(0);
    count++;
    ctx.set(COUNT, count);

    String hist = ctx.get(HISTORY).orElse("");
    hist += " ";
    hist += refinedGreeting;
    ctx.set(HISTORY, hist);

    if ("test".equals(message)) {
      ctx.sleep(Duration.ofSeconds(30));
    }

    return refinedGreeting + " " + ctx.key() + " for the " + count + "-th time: " + message;
  }

  @Handler
  public String ungreet(ObjectContext ctx) {
    int count = ctx.get(COUNT).orElse(0);
    count--;
    ctx.set(COUNT, count);
    return ctx.key() + " down to " + count;
  }























  


  @Handler
  public int inc(ObjectContext ctx) {
    int count = ctx.get(COUNT).orElse(0);
    count++;
    ctx.set(COUNT, count);
    return count;
  }

  @Handler
  public int dec(ObjectContext ctx) {
    int count = ctx.get(COUNT).orElse(0);
    count--;
    ctx.set(COUNT, count);
    return count;
  }

  @Shared
  public int get(SharedObjectContext ctx) {
    return ctx.get(COUNT).orElse(0);
  }
}
