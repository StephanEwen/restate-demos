package com.acme.apis.svcs;

import com.acme.types.Deposit;
import com.acme.types.Withdrawal;
import dev.restate.sdk.ObjectContext;
import dev.restate.sdk.annotation.Handler;
import dev.restate.sdk.annotation.VirtualObject;
import dev.restate.sdk.common.StateKey;

import static dev.restate.sdk.JsonSerdes.LONG;

@VirtualObject(name = "account")
public class AccountService {

  private final StateKey<Long> BALANCE = StateKey.of("balance", LONG);

  @Handler
  public boolean withdraw(ObjectContext ctx, Withdrawal withdraw) {
    final long balance = ctx.get(BALANCE).orElse(100_000L);
    if (balance < withdraw.cents) {
      return false;
    }

    final long newBalance = balance - withdraw.cents;
    ctx.set(BALANCE, balance - withdraw.cents);
    return true;
  }

  @Handler
  public void deposit(ObjectContext ctx, Deposit deposit) {
    final long balance = ctx.get(BALANCE).orElse(100_000L);
    ctx.set(BALANCE, balance + deposit.cents);
  }
}
