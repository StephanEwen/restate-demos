package com.acme.apis;

import com.acme.types.Deposit;
import com.acme.types.Withdrawal;
import com.acme.util.Util;
import dev.restate.sdk.client.CallRequestOptions;
import dev.restate.sdk.common.TerminalException;

public class AccountApi {

  public static boolean withdraw(String account, long cents, String token) {
    demoActions(account, cents);

    boolean success = accountClient
        .connect(RESTATE_URI, account)
        .withdraw(
            new Withdrawal(account, cents),
            CallRequestOptions.DEFAULT.withIdempotency(token)
        );

    System.out.printf(" >>> WITHDRAW : %s (%d cents) - token: %s - %s\n",
        account, cents, token, success ? "SUCCESS" : "FAILED");
    return true;
  }

  public static void deposit(String account, long cents, String token) {
    demoActions(account, cents);

    accountClient
        .connect(RESTATE_URI, account)
        .deposit(
            new Deposit(account, cents),
            CallRequestOptions.DEFAULT.withIdempotency(token)
        );

    System.out.printf(" >>> DEPOSIT : %s (%d cents) - token: %s\n", account, cents, token);
  }

  public static void enqueueRefundRequest(String account, long cents, String token) {}



  public static boolean earmark(String account, long cents, String token) {
    return true;
  }

  public static void releaseEarmark(String token) {}


  private static void demoActions(String account, long amout) {
    if (amout == 1337) {
      throw new NumberFormatException("Parse error");
    }

    if (account.startsWith("9")) {
      throw new TerminalException("Account unavailable");
    }
    if (account.startsWith("8")) {
      Util.sleep(500);
      if (Math.random() < 0.66) {
        throw new RuntimeException("Temporary error");
      }
    }
    if (account.startsWith("6")) {
      Util.sleep(30_000);
    }
    if (account.startsWith("5")) {
      Util.sleep(5_000);
    }
  }

  private static final String RESTATE_URI = "http://localhost:18080";
}
