// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.

import * as bip39 from "jsr:@scure/bip39@1.5.4";
import { wordlist as english } from "jsr:@scure/bip39/wordlists/english";
import { HDKey } from "jsr:@scure/bip32@1.6.2";
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";
import { keccak256 } from "https://esm.sh/ethers";

/**
 * Ethereum ウォレットを表すクラス。
 *
 * このモジュールは、@scure/bip39 を用いてミニモニックの生成・管理を行い、
 * @scure/bip32 を用いて HD キーの派生を実現します。
 */
export class Wallet {
  /** ミニモニックフレーズ */
  readonly mnemonic: string;
  /** 秘密鍵 (hex 文字列) */
  readonly privateKey: string;
  /** 公開鍵から導出された Ethereum アドレス */
  readonly address: string;

  /**
   * 新しい Wallet インスタンスを生成する。
   * @param mnemonic - ミニモニックフレーズ
   * @param privateKey - 秘密鍵 (hex 文字列)
   * @param address - Ethereum アドレス
   */
  constructor(mnemonic: string, privateKey: string, address: string) {
    this.mnemonic = mnemonic;
    this.privateKey = privateKey;
    this.address = address;
  }

  /**
   * 新しい Ethereum ウォレットを作成する。
   *
   * @scure/bip39 の英語単語リストを使用してミニモニックを生成し、
   * シードを派生して @scure/bip32 による HD キー派生を行います。
   * 標準派生パス "m/44'/60'/0'/0/0" を使用します。
   *
   * @returns 新しい Wallet インスタンスを返す Promise
   */
  static async create(): Promise<Wallet> {
    // 英語の単語リストを用いて新しいミニモニックを生成する。
    const mnemonic: string = bip39.generateMnemonic(english);
    // ミニモニックからシード (Uint8Array) を派生する（パスワードは使用しない）。
    const seed: Uint8Array = await bip39.mnemonicToSeed(mnemonic, "");
    // マスターシードから HDKey インスタンスを作成する。
    const hdkey = HDKey.fromMasterSeed(seed);
    // 標準の Ethereum 派生パス "m/44'/60'/0'/0/0" を使用してキーを派生する。
    const derived = hdkey.derive("m/44'/60'/0'/0/0");
    if (!derived.privateKey) {
      throw new Error("Cannot derive private key from the seed");
    }
    // 派生された秘密鍵 (Uint8Array) を hex 文字列に変換する。
    const privateKeyHex: string = "0x" +
      Buffer.from(derived.privateKey).toString("hex");
    if (!derived.publicKey) {
      throw new Error("Cannot derive public key from the seed");
    }
    // 非圧縮公開鍵の場合、先頭の 0x04 を除去する。
    const uncompressedPubKey: Uint8Array = derived.publicKey[0] === 0x04
      ? derived.publicKey.slice(1)
      : derived.publicKey;
    // Keccak-256 でハッシュし、ハッシュの下位 20 バイトから Ethereum アドレスを生成する。
    const hash: string = keccak256(uncompressedPubKey);
    const address: string = "0x" + hash.slice(-40);
    return new Wallet(mnemonic, privateKeyHex, address.toLowerCase());
  }
}
