package com.acme;

import dev.restate.sdk.http.vertx.RestateHttpEndpointBuilder;

public class App1 {

  public static void main(String[] args) {
    RestateHttpEndpointBuilder.builder()
        .bind(new Svc1())
        .bind(new Svc3())
        .buildAndListen(9080);
  }
}
