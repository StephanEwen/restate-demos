package com.acme.types;

public class Deposit {

  public String account;
  public long cents;

  public Deposit() {}

  public Deposit(String account, long cents) {
    this.account = account;
    this.cents = cents;
  }
}
