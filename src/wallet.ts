// src/wallet.ts
// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.

import * as bip39 from 'jsr:@scure/bip39@1.5.4'
import { wordlist as english } from 'jsr:@scure/bip39/wordlists/english'
import { HDKey } from 'jsr:@scure/bip32@1.6.2'
import { Buffer } from 'node:buffer'
import jsSha3 from 'https://esm.sh/js-sha3@0.8.0?target=deno'
import type { Address, Transaction } from './types.ts'
import { signMessage, signTransaction } from './signature.ts'

/**
 * Ethereum ウォレットを表すクラス。
 *
 * このクラスは、ミニモニック生成、HD キー派生、トランザクションおよびメッセージの署名など、
 * ウォレットとして必要な機能を提供します。
 */
export class Wallet {
  /** ミニモニックフレーズ */
  readonly mnemonic: string
  /** 秘密鍵 (hex 文字列) */
  readonly privateKey: string
  /** Ethereum アドレス */
  readonly address: Address

  /**
   * 新しい Wallet インスタンスを生成する。
   * @param mnemonic - ミニモニックフレーズ
   * @param privateKey - 秘密鍵 (hex 文字列)
   * @param address - Ethereum アドレス
   */
  constructor(mnemonic: string, privateKey: string, address: Address) {
    this.mnemonic = mnemonic
    this.privateKey = privateKey
    this.address = address
  }

  /**
   * 新しい Ethereum ウォレットを作成する。
   *
   * @scure/bip39 の英語単語リストを用いてミニモニックを生成し、
   * シードを派生して @scure/bip32 による HD キー派生を行います。
   * 標準派生パス "m/44'/60'/0'/0/0" を使用します。
   *
   * @returns 新しい Wallet インスタンスを返す Promise
   */
  static async create(): Promise<Wallet> {
    const mnemonic: string = bip39.generateMnemonic(english)
    const seed: Uint8Array = await bip39.mnemonicToSeed(mnemonic, '')
    const hdkey = HDKey.fromMasterSeed(seed)
    const derived = hdkey.derive("m/44'/60'/0'/0/0")
    if (!derived.privateKey) {
      throw new Error('Cannot derive private key from the seed')
    }
    const privateKeyHex: string = '0x' + Buffer.from(derived.privateKey).toString('hex')
    if (!derived.publicKey) {
      throw new Error('Cannot derive public key from the seed')
    }
    const uncompressedPubKey: Uint8Array = derived.publicKey[0] === 0x04
      ? derived.publicKey.slice(1)
      : derived.publicKey
    const hash: string = jsSha3.keccak256(uncompressedPubKey)
    const address: Address = `0x${hash.slice(-40)}` as Address
    return new Wallet(mnemonic, privateKeyHex, address)
  }

  /**
   * 与えられたトランザクションデータに対して、このウォレットの秘密鍵で署名する。
   *
   * @param tx - 署名対象の Transaction オブジェクト。
   * @returns 署名済みトランザクションの hex 文字列。
   */
  async sign(tx: Transaction): Promise<string> {
    return await signTransaction(tx, this.privateKey)
  }

  /**
   * メッセージに対して EIP-191 形式で署名する。
   *
   * @param message - 署名するメッセージ (文字列または Uint8Array)。
   * @returns 署名済みメッセージの hex 文字列。
   */
  async signMessage(message: string | Uint8Array): Promise<string> {
    return await signMessage(message, this.privateKey)
  }
}
