package com.acme.types;

public class Result {
  public boolean success;
  public long newBalance;

  public Result(boolean success, long newBalance) {
    this.success = success;
    this.newBalance = newBalance;
  }
}
