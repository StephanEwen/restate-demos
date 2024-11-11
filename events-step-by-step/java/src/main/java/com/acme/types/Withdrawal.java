package com.acme.types;

public class Withdrawal {

  public String account;
  public long cents;

  public Withdrawal() {}

  public Withdrawal(String account, long cents) {
    this.account = account;
    this.cents = cents;
  }
}
