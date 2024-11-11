package com.acme.backup;

import com.acme.util.Greetings;
import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.http.vertx.RestateHttpEndpointBuilder;

import java.time.Duration;

import static dev.restate.sdk.JsonSerdes.*;

@Service(name = "greeter")
public class Greeter {

  @Handler
  public String greet(Context ctx, String name) {
    return "Hello " + name;
  }

  @Handler
  public String slow(Context ctx, String name) {
    ctx.sleep(Duration.ofSeconds(15));

    return "Hello " + name + " after a while...";
  }

  @Handler
  public String random(Context ctx, String name) {
    String randomGreet = ctx.run("select greeting", STRING,
        () -> Greetings.randomGreeting()
    );

    return randomGreet + " " + name;
  }


  public static void main(String[] args) {
    RestateHttpEndpointBuilder.builder()
        .bind(new Greeter())
        .buildAndListen(9081);
  }
}




