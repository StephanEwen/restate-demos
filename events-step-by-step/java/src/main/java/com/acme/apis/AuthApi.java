package com.acme.apis;

public class AuthApi {

  public static boolean earmark(String account, long cents, String token) {
    return true;
  }

  public static void releaseEarmark(String token) {}

  public static boolean withdraw(String account, long cents, String token) {
    return true;
  }

  public static void deposit(String account, long cents, String token) {}

  public static void enqueueRefundRequest(String account, long cents, String token) {}


}
