package com.acme.types;

public class Result {
  public final boolean success;
  public final long newBalance;

  public Result(boolean success, long newBalance) {
    this.success = success;
    this.newBalance = newBalance;
  }
}
