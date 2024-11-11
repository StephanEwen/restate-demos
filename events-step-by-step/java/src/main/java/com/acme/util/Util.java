package com.acme.util;

public class Util {

  public static void sleep(long millies) {
    try {
      Thread.sleep(millies);
    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
    }
  }
}
