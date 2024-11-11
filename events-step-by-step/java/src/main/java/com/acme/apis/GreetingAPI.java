package com.acme.apis;

public class GreetingAPI {

  public static String selectGreeting() {
    return Math.random() < 0.5 ? "Hello" : "Howdy";
  }

  public static String refineGreeting(String greeting) {
    return greeting + (Math.random() < 0.5 ? " my dear" : " beloved");
  }

  public static String eventuallyConsistentGreeting(String greeting) {
    if (Math.random() < 0.5) {
      return "NOPE";
    }
    return greeting + (Math.random() < 0.5 ? " my dear" : " beloved");
  }
}
