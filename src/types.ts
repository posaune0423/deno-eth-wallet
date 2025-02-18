// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.

/** Ethereum アドレスを表す型 (常に "0x" 付きの hex 文字列) */
export type Address = `0x${string}`

/** トランザクションハッシュを表す型 (常に "0x" 付きの hex 文字列) */
export type Hash = `0x${string}`

/**
 * EIP-2930 / EIP-1559 で使用される Access List の型定義。
 *
 * 各要素は、アドレスとそのアドレスに対する storageKeys (hex 文字列) の配列から構成される。
 */
export type AccessList = readonly {
  address: Address
  storageKeys: readonly Hex[]
}[]

/** Hex、Uint8Array、またはその両方を許容する型。 */
export type Hex = Uint8Array | string

/** 秘密鍵として扱える型。 */
export type PrivKey = Hex | bigint

/** 署名の compact 形式 (r, s の連結) とリカバリビットを含む型。 */
export type SignatureWithRecovery = {
  r: bigint
  s: bigint
  recovery: number
}

/** Bytes のエイリアス。 */
export type Bytes = Uint8Array

/** EIP‑7702 で利用される署名済み authorization リストの型定義。 */
export type SignedAuthorizationList = ReadonlyArray<{
  authorization: Hex
  signature: Hex
}>

// ─── トランザクション型定義 ─────────────────────────────────────────────
/**
 * 統一されたトランザクション型。
 *
 * Legacy, EIP-1559, EIP-2930, EIP‑7702 の各トランザクションをユニオン型で表現します。
 */

/**
 * Legacy (EIP-155) トランザクション型。
 *
 * ※ EIP-155 以降では、chainId は必須となっています。
 */
export interface Transaction {
  nonce: bigint
  // from: Address
  to: Address
  value: bigint
  // data: Hex
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  gasLimit: bigint
  chainId: number
  accessList?: AccessList
  type?: number
}

/**
 * EIP-1559 トランザクション型。
 *
 * Legacy の gasPrice の代わりに、maxFeePerGas および maxPriorityFeePerGas を使用します。
 */
export interface TransactionEIP1559 {
  nonce: bigint
  from: Address
  to: Address
  value: bigint
  data: Hex
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  gasLimit: bigint
  chainId: number
  accessList?: AccessList
}

/**
 * EIP-2930 トランザクション型。
 *
 * Legacy と同様に gasPrice を使用しますが、必須の accessList フィールドが追加されています。
 */
export interface TransactionEIP2930 {
  nonce: bigint
  from: Address
  to: Address
  value: bigint
  data: Hex
  gasPrice: bigint
  gasLimit: bigint
  chainId: number
  accessList: AccessList
}

/**
 * EIP‑7702 トランザクション型。
 *
 * EIP‑1559 と同様にガス価格を maxFeePerGas および maxPriorityFeePerGas で指定し、
 * accessList に加えて、authorizationList を必須フィールドとします。
 */
export interface TransactionEIP7702 {
  nonce: bigint
  from: Address
  to: Address
  value: bigint
  data: Hex
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  gasLimit: bigint
  chainId: number
  accessList: AccessList
  authorizationList: SignedAuthorizationList
}
