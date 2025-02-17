// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.

import * as path from 'https://deno.land/std@0.177.0/path/mod.ts'
import {
  generatePrivateKey,
  privateKeyToAccount,
} from 'https://esm.sh/viem/accounts'

const WALLET_FILE = path.join(Deno.cwd(), 'wallet.json')

/**
 * Ethereum ウォレットを表すクラス。
 *
 * このモジュールは、@scure/bip39 を用いてミニモニックの生成・管理を行い、
 * @scure/bip32 を用いて HD キーの派生を実現します。
 */
export class Wallet {
  /** 秘密鍵 (hex 文字列) */
  readonly privateKey: `0x${string}`
  /** 公開鍵から導出された Ethereum アドレス */
  readonly address: `0x${string}`

  /**
   * 新しい Wallet インスタンスを生成する。
   * @param mnemonic - ミニモニックフレーズ
   * @param privateKey - 秘密鍵 (hex 文字列)
   * @param address - Ethereum アドレス
   */
  constructor(privateKey: `0x${string}`, address: `0x${string}`) {
    this.privateKey = privateKey
    this.address = address
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
  static create(): Wallet {
    // 英語の単語リストを用いて新しいミニモニックを生成する。
    const privateKey = generatePrivateKey()
    // ミニモニックからシード (Uint8Array) を派生する（パスワードは使用しない）。
    const account = privateKeyToAccount(privateKey)

    return new Wallet(privateKey, account.address)
  }

  /** Saves the wallet to a file. */
  async saveWalletToFile(wallet: Wallet): Promise<void> {
    const data = JSON.stringify(
      {
        privateKey: wallet.privateKey,
        address: wallet.address,
      },
      null,
      2
    )
    await Deno.writeTextFile(WALLET_FILE, data)
    console.log('Wallet saved to', WALLET_FILE)
  }

  /** Loads the wallet from a file. */
  static async loadWalletFromFile(): Promise<Wallet> {
    try {
      const data = await Deno.readTextFile(WALLET_FILE)
      const obj = JSON.parse(data)
      return new Wallet(obj.privateKey, obj.address)
    } catch {
      console.error(
        "Wallet file not found. Create a wallet first using the 'create' command"
      )
      Deno.exit(1)
    }
  }
}
