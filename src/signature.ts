// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.

import * as secp from 'jsr:@noble/secp256k1'
import { toHex, toRlp } from 'https://esm.sh/viem?target=deno'
// デフォルトエクスポートを利用して、js-sha3 の keccak256 を使用する
import jsSha3 from 'https://esm.sh/js-sha3@0.8.0?target=deno'
import { Transaction } from './types.ts'

/**
 * トランザクションオブジェクトと秘密鍵を受け取り、署名済み生トランザクション (hex 文字列) を返す関数。
 *
 * @param tx - 署名対象のトランザクションデータ（nonce, gasPrice, gasLimit, to, value, data を含む）。
 * @param privateKey - 署名に使用する秘密鍵 (hex 文字列)。
 * @param chainId - チェーンID。
 * @returns 署名済みトランザクションの hex 文字列。
 */
export async function signTransaction(
  tx: Transaction,
  privateKey: string,
): Promise<string> {
  // viem の toRlp を使って RLP エンコードする
  const encoded = toRlp([Object.values(tx).map((value) => toHex(value))])

  // jsSha3.keccak256 を利用してハッシュを生成する
  const msgHashHex = jsSha3.keccak256(encoded)

  // 秘密鍵の先頭に 0x があれば削除
  const priv = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey
  // noble-secp256k1 の sign 関数で署名 (recovered: true でリカバリビットを取得)
  const sig = await secp.signAsync(msgHashHex, priv)
  // EIP-155 のルール： v = chainId * 2 + 35 + recovery
  const v = BigInt(tx.chainId) * 2n + 35n + BigInt(sig.recovery)
  const vHex = v.toString(16).padStart(2, '0')
  return '0x' + sig.toCompactHex() + vHex
}

/**
 * EIP-191 形式でメッセージに署名する関数。
 *
 * @param message - 署名するメッセージ (文字列または Uint8Array)。
 * @param privateKey - 署名に使用する秘密鍵 (hex 文字列)。
 * @returns 署名済みメッセージの hex 文字列。
 */
export async function signMessage(
  message: string | Uint8Array,
  privateKey: string,
): Promise<string> {
  const data = typeof message === 'string' ? new TextEncoder().encode(message) : message
  const prefix = new TextEncoder().encode(
    `\x19Ethereum Signed Message:\n${data.length}`,
  )
  const concatenated = new Uint8Array(prefix.length + data.length)
  concatenated.set(prefix)
  concatenated.set(data, prefix.length)
  const msgHashHex = jsSha3.keccak256(concatenated)
  const priv = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey
  const sig = await secp.signAsync(msgHashHex, priv)
  const v = sig.recovery ?? 0
  const vHex = v.toString(16).padStart(2, '0')
  return '0x' + sig.toCompactHex() + vHex
}
