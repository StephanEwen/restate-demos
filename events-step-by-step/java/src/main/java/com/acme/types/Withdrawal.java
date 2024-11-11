package com.acme.types;

public class Withdrawal {

  public final String account;
  public final long cents;

  public Withdrawal(String account, long cents) {
    this.account = account;
    this.cents = cents;
  }
}
