package com.acme;

import com.acme.part1.HelloClient;
import dev.restate.sdk.Context;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.Service;
import dev.restate.sdk.common.TerminalException;

@Service
public class HelloSubmitter {

  @Handler
  public String greet(Context ctx, String name) {
//    try {
//      return HelloClient.fromContext(ctx).hello().await();
//    }
//    catch (TerminalException e) {
//      System.out.println("FAILED");
      return "n/a";
//    }
  }
}




