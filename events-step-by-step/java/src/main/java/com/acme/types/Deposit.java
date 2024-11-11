package com.acme.types;

public class Deposit {

  public final String account;
  public final long cents;

  public Deposit(String account, long cents) {
    this.account = account;
    this.cents = cents;
  }
}
