// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.

import { intToBuffer, hexToBuffer, rlpEncode, keccak256 } from './utils.ts'
import { ec as EC } from 'https://esm.sh/elliptic@6.5.4?target=deno'
import { Buffer } from 'https://deno.land/std@0.177.0/node/buffer.ts'

const secp256k1 = new EC('secp256k1')

/**
 * Ethereum トランザクションを表すクラス。
 */
export class Transaction {
  nonce: bigint
  gasPrice: bigint
  gasLimit: bigint
  to: string
  value: bigint
  data: string
  chainId: number

  /**
   * 新しい Transaction インスタンスを生成する。
   * @param nonce - トランザクションの nonce。
   * @param gasPrice - ガス価格。
   * @param gasLimit - ガスリミット。
   * @param to - 送信先アドレス。
   * @param value - 送金額 (wei 単位)。
   * @param data - Calldata。
   * @param chainId - チェーンID。
   */
  constructor(
    nonce: bigint,
    gasPrice: bigint,
    gasLimit: bigint,
    to: string,
    value: bigint,
    data: string,
    chainId: number
  ) {
    this.nonce = nonce
    this.gasPrice = gasPrice
    this.gasLimit = gasLimit
    this.to = to
    this.value = value
    this.data = data
    this.chainId = chainId
  }

  /**
   * 指定された秘密鍵でトランザクションに署名する。
   * @param privateKey - 秘密鍵 (hex 文字列)。
   * @returns 生署名済みトランザクション (hex 文字列)。
   */
  async sign(privateKey: string): Promise<string> {
    const nonceBuf = intToBuffer(this.nonce)
    const gasPriceBuf = intToBuffer(this.gasPrice)
    const gasLimitBuf = intToBuffer(this.gasLimit)
    const toBuf = this.to ? hexToBuffer(this.to) : new Uint8Array([])
    const valueBuf = intToBuffer(this.value)
    const dataBuf = this.data ? hexToBuffer(this.data) : new Uint8Array([])
    const chainIdBuf = intToBuffer(this.chainId)
    // EIP‑155 対応のため、署名前の RLP 配列は [nonce, gasPrice, gasLimit, to, value, data, chainId, 0, 0]
    const rlpArray = [
      nonceBuf,
      gasPriceBuf,
      gasLimitBuf,
      toBuf,
      valueBuf,
      dataBuf,
      chainIdBuf,
      new Uint8Array([]),
      new Uint8Array([]),
    ]
    const encoded = rlpEncode(rlpArray)
    const msgHash = new Uint8Array(Buffer.from(await keccak256(encoded)))
    const keyPair = secp256k1.keyFromPrivate(privateKey.slice(2), 'hex')
    const sig = keyPair.sign(msgHash, { canonical: true })
    const r = sig.r.toArrayLike(Uint8Array, 'be', 32)
    const s = sig.s.toArrayLike(Uint8Array, 'be', 32)
    const recoveryParam = sig.recoveryParam // 0 または 1

    if (recoveryParam === null) {
      throw new Error('recoveryParam is null')
    }

    const v = BigInt(this.chainId) * 2n + 35n + BigInt(recoveryParam)
    const vBuf = intToBuffer(v)
    const signedArray = [
      nonceBuf,
      gasPriceBuf,
      gasLimitBuf,
      toBuf,
      valueBuf,
      dataBuf,
      vBuf,
      r,
      s,
    ]
    const signedEncoded = rlpEncode(signedArray)
    return '0x' + Buffer.from(signedEncoded).toString('hex')
  }
}
