package com.acme.part1;

import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.http.vertx.RestateHttpEndpointBuilder;

@Service
public class Hello {

  @Handler
  public String helloWorld(Context ctx) {
    return "Hello World!";
  }

  @Handler
  public String greet(Context ctx, String name) {
    return "Hello " + name;
  }


  public static void main(String[] args) {
    RestateHttpEndpointBuilder.builder()
        .bind(new Hello())
        .buildAndListen(9080);
  }
}

























