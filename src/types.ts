// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.

/** Ethereum アドレスを表す型 (hex 文字列) */
export type Address = `0x${string}`

/** トランザクションハッシュを表す型 (hex 文字列) */
export type Hash = `0x${string}`

/**
 * Ethereum トランザクションデータの型定義。
 */
export type Transaction = {
  nonce: bigint
  gasPrice: bigint
  gasLimit: bigint
  to: Address
  value: bigint
  data: string
  chainId: number
}

/**
 * Hex、Uint8Array、またはその両方を許容する型。
 */
export type Hex = Uint8Array | string

/**
 * 秘密鍵として扱える型。
 */
export type PrivKey = Hex | bigint

/**
 * 署名の compact 形式 (r, s の連結) とリカバリビットを含む型。
 */
export type SignatureWithRecovery = {
  r: bigint
  s: bigint
  recovery: number
}

/**
 * Bytes のエイリアス。
 */
export type Bytes = Uint8Array
