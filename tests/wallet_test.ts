import {
  assert,
  assertMatch,
} from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { Wallet } from "../src/wallet.ts";

Deno.test("Wallet.create() should generate a valid wallet", async () => {
  const wallet = await Wallet.create();

  // ミニモニックが存在すること（通常、12語以上で構成される）
  const words = wallet.mnemonic.split(" ");
  assert(words.length >= 12, "Mnemonic should contain at least 12 words");

  // 秘密鍵は "0x" で始まり、64桁の16進数表現であること
  assertMatch(
    wallet.privateKey,
    /^0x[0-9a-fA-F]{64}$/,
    "Private key should be a 0x-prefixed 64-digit hex string",
  );

  // アドレスは "0x" で始まり、40桁の16進数表現（小文字）であること
  assertMatch(
    wallet.address,
    /^0x[0-9a-f]{40}$/,
    "Address should be a 0x-prefixed 40-digit hex string in lower case",
  );
});
