// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

/**
 * RPC client for JSON‑RPC communication.
 */
export class RpcClient {
  #rpcUrl: string;
  #rpcId = 1;

  /**
   * Constructs a new RpcClient.
   * @param rpcUrl - The JSON‑RPC URL.
   */
  constructor(rpcUrl: string) {
    this.#rpcUrl = rpcUrl;
  }

  /**
   * Makes a JSON‑RPC request.
   * @param method - The JSON‑RPC method.
   * @param params - The method parameters.
   * @returns The result.
   */
  async request(method: string, params: unknown[]): Promise<unknown> {
    const payload = {
      jsonrpc: "2.0",
      method,
      params,
      id: this.#rpcId++,
    };
    const response = await fetch(this.#rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  }

  /** Gets the nonce for the given address. */
  async getNonce(address: string): Promise<bigint> {
    const result = await this.request("eth_getTransactionCount", [
      address,
      "pending",
    ]);
    return BigInt(result as string);
  }

  /** Gets the current gas price. */
  async getGasPrice(): Promise<bigint> {
    const result = await this.request("eth_gasPrice", []);
    return BigInt(result as string);
  }

  /** Gets the chain ID. */
  async getChainId(): Promise<number> {
    const result = await this.request("eth_chainId", []);
    return parseInt(result as string, 16);
  }

  /** Estimates the gas for a given transaction. */
  async estimateGas(tx: unknown): Promise<bigint> {
    const result = await this.request("eth_estimateGas", [tx]);
    return BigInt(result as string);
  }

  /** Sends a raw transaction. */
  async sendRawTransaction(rawTx: string): Promise<string> {
    const result = await this.request("eth_sendRawTransaction", [rawTx]);
    return result as string;
  }

  /** Gets the balance of an address. */
  async getBalance(address: string): Promise<bigint> {
    const result = await this.request("eth_getBalance", [address, "latest"]);
    return BigInt(result as string);
  }
}
