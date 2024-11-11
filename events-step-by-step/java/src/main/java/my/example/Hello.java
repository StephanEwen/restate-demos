/*
 * Copyright (c) 2024 - Restate Software, Inc., Restate GmbH
 *
 * This file is part of the Restate examples,
 * which is released under the MIT license.
 *
 * You can find a copy of the license in the file LICENSE
 * in the root directory of this repository or package or at
 * https://github.com/restatedev/examples/
 */

package my.example;

import dev.restate.sdk.Context;
import dev.restate.sdk.JsonSerdes;
import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.Serde;
import dev.restate.sdk.common.StateKey;
import dev.restate.sdk.common.TerminalException;
import dev.restate.sdk.http.vertx.RestateHttpEndpointBuilder;

import static dev.restate.sdk.JsonSerdes.*;


import java.util.UUID;

import static dev.restate.sdk.serde.jackson.JacksonSerdes.*;


@VirtualObject
public class Hello {

  private static StateKey<Integer> COUNT = StateKey.of("count", INT);

  @Handler
  public String greet(ObjectContext ctx, String name) {



    int soFar = ctx.get(COUNT).orElse(0);

    return "";

  }

  public static void main(String[] args) {
    RestateHttpEndpointBuilder.builder()
            .bind(new Hello())
            .buildAndListen(9080);
  }
}
