package com.acme.apis.svcs;

import dev.restate.sdk.http.vertx.RestateHttpEndpointBuilder;

public class App {

  public static void main(String[] args) {
    RestateHttpEndpointBuilder.builder()
        .bind(new AccountService())
        .bind(new RefundService())
        .buildAndListen(19080);
  }

}
