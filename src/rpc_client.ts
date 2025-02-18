// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.

import { Transaction } from './types.ts'

/**
 * JSON‑RPC 通信用クラス。
 */
export class RpcClient {
  #rpcUrl: string
  #rpcId = 1

  /**
   * 新しい RpcClient を生成する。
   * @param rpcUrl - JSON‑RPC の URL。
   */
  constructor(rpcUrl: string) {
    this.#rpcUrl = rpcUrl
  }

  /**
   * JSON‑RPC リクエストを実行する。
   * @param method - JSON‑RPC メソッド名。
   * @param params - メソッドのパラメータ。
   * @returns 結果。
   */
  async request(method: string, params: unknown[]): Promise<unknown> {
    const payload = {
      jsonrpc: '2.0',
      method,
      params,
      id: this.#rpcId++,
    }
    const response = await fetch(this.#rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json()
    if (data.error) throw new Error(data.error.message)
    return data.result
  }

  /** 指定されたアドレスの nonce を取得する。 */
  async getNonce(address: string): Promise<number> {
    const result = await this.request('eth_getTransactionCount', [
      address,
      'pending',
    ])
    return Number(result as string)
  }

  /** 指定されたアドレスの残高を取得する。 */
  async getBalance(address: string): Promise<bigint> {
    const result = await this.request('eth_getBalance', [address, 'latest'])
    return BigInt(result as string)
  }

  /** 現在の gasPrice を取得する。 */
  async getGasPrice(): Promise<bigint> {
    const result = await this.request('eth_gasPrice', [])
    return BigInt(result as string)
  }

  /** チェーンID を取得する。 */
  async getChainId(): Promise<number> {
    const result = await this.request('eth_chainId', [])
    return parseInt(result as string, 16)
  }

  /** 指定されたトランザクションの gas 見積もりを取得する。 */
  async estimateGas(tx: unknown): Promise<bigint> {
    const result = await this.request('eth_estimateGas', [tx])
    return BigInt(result as string)
  }

  /** 生トランザクションを送信する。 */
  async sendRawTransaction(rawTx: string): Promise<string> {
    const result = await this.request('eth_sendRawTransaction', [rawTx])
    return result as string
  }

  /** トランザクションを送信する。 */
  async sendTransaction(tx: Transaction): Promise<string> {
    const result = await this.request('eth_sendTransaction', [tx])
    return result as string
  }
}
