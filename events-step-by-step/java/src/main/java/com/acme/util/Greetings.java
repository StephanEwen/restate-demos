package com.acme.util;

public class Greetings {

  public static String randomGreeting() {
    String greeting = pickRandomGreeting();
    System.out.println(" >>> " + greeting);
    return greeting;
  }

  public static String pickRandomGreeting() {
    int i = (int) (Math.random() * 5);
    switch (i) {
      case 0: return "Howdy";
      case 1: return "Cheers";
      case 2: return "Hola";
      case 3: return "Salut";
      default: return "Hello";
    }
  }
}
