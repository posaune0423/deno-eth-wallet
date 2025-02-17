// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { keccak256 } from './utils.ts'

/**
 * Minimal ABI encoder.
 * Supports: address, uint/int, bool, bytes32.
 *
 * @param abi - The contract ABI array.
 * @param functionName - The function name.
 * @param args - The function arguments.
 * @returns The encoded calldata as a hex string.
 */
export async function encodeFunctionCall(
  abi: unknown[],
  functionName: string,
  args: unknown[]
): Promise<string> {
  const funcAbi = abi.find(
    (item: any) => item.type === 'function' && item.name === functionName
  )
  if (!funcAbi) {
    throw new Error(`Function "${functionName}" not found in ABI`)
  }
  const funcAbiWithInputs = funcAbi as { inputs: { type: string }[] }
  const types = funcAbiWithInputs.inputs.map(
    (input: { type: string }): string => input.type
  )
  const signature = `${functionName}(${types.join(',')})`
  const hash = await keccak256(signature)
  const methodSelector = hash.slice(0, 8)
  let encodedArgs = ''
  for (let i = 0; i < types.length; i++) {
    const type = types[i]
    const arg = args[i]
    if (type === 'address') {
      let clean = (arg as string).toLowerCase()
      if (clean.startsWith('0x')) clean = clean.slice(2)
      encodedArgs += clean.padStart(64, '0')
    } else if (type.startsWith('uint') || type.startsWith('int')) {
      const bn = BigInt(arg as string)
      const hex = bn.toString(16)
      encodedArgs += hex.padStart(64, '0')
    } else if (type === 'bool') {
      const val = arg ? '1' : '0'
      encodedArgs += val.padStart(64, '0')
    } else if (type === 'bytes32') {
      let clean = (arg as string).startsWith('0x')
        ? (arg as string).slice(2)
        : (arg as string)
      encodedArgs += clean.padEnd(64, '0')
    } else {
      throw new Error(`Type "${type}" not supported in minimal ABI encoder`)
    }
  }
  return '0x' + methodSelector + encodedArgs
}
