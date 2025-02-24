/**
 * Legacy (EIP-155) トランザクション型。
 *
 * ※ EIP-155 以降では、chainId は必須となっています。
 */
export interface Transaction {
  nonce: number
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  data: `0x${string}`
  gas: bigint
  gasPrice: bigint
  // gasLimit: bigint
  // maxPriorityFeePerGas: bigint
  // maxFeePerGas: bigint
  chainId: number
}
