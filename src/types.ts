/**
 * Legacy (EIP-155) トランザクション型。
 *
 * ※ EIP-155 以降では、chainId は必須となっています。
 */
export interface Transaction {
  nonce: bigint
  from: `0x${string}`
  to: `0x${string}`
  value: bigint
  data: `0x${string}`
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  gasLimit: bigint
  chainId: number
}
