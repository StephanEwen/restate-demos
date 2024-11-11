package com.acme;

import dev.restate.sdk.http.vertx.RestateHttpEndpointBuilder;

public class App2 {

  public static void main(String[] args) {
    RestateHttpEndpointBuilder.builder()
        .bind(new Svc2())
        .buildAndListen(9081);
  }
}
