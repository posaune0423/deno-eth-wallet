// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.

/**
 * Ethereum トランザクションを表すクラス。
 */
export interface Transaction {
  nonce: bigint;
  gasPrice: bigint;
  gasLimit: bigint;
  to: string;
  value: bigint;
  data: string;
  chainId: number;
}
