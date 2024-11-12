package com.acme.apis.svcs;

import com.fasterxml.jackson.core.type.TypeReference;
import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.StateKey;
import dev.restate.sdk.http.vertx.RestateHttpEndpointBuilder;
import dev.restate.sdk.serde.jackson.JacksonSerdes;

import java.util.Arrays;

@VirtualObject
public class RefundService {

  private final StateKey<long[]> AMOUNTS = StateKey.of("amount", JacksonSerdes.of(new TypeReference<>(){}));

  @Handler
  public void enqueueRefundRequest(ObjectContext ctx, long amount) {
    long[] deposits = ctx.get(AMOUNTS).orElse(new long[0]);
    long[] newDeposits = Arrays.copyOf(deposits, deposits.length + 1);
    newDeposits[deposits.length] = amount;
    ctx.set(AMOUNTS, newDeposits);
  }

  public static void main(String[] args) {
    RestateHttpEndpointBuilder.builder()
        .bind(new RefundService())
        .buildAndListen(19080);
  }
}
