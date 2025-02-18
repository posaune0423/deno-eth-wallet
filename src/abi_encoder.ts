// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.

/**
 * Minimal ABI エンコーダ。
 * 対応: address, uint/int, bool, bytes32。
 *
 * @param abi - コントラクト ABI の配列。
 * @param functionName - 呼び出す関数名。
 * @param args - 関数の引数。
 * @returns エンコードされた calldata を hex 文字列として返す。
 */
export async function encodeFunctionCall(
  abi: unknown[],
  functionName: string,
  args: unknown[],
): Promise<string> {
  const funcAbi = abi.find(
    (item: any) => item.type === 'function' && item.name === functionName,
  ) as { inputs: { type: string }[] }
  if (!funcAbi) {
    throw new Error(`Function "${functionName}" not found in ABI`)
  }
  const types = funcAbi.inputs.map(
    (input: { type: string }): string => input.type,
  )
  const signature = `${functionName}(${types.join(',')})`
  const { keccak256 } = await import('https://esm.sh/js-sha3@0.8.0?target=deno')
  const hash = keccak256(signature)
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
      let clean = (arg as string).startsWith('0x') ? (arg as string).slice(2) : (arg as string)
      encodedArgs += clean.padEnd(64, '0')
    } else {
      throw new Error(`Type "${type}" not supported in minimal ABI encoder`)
    }
  }
  return '0x' + methodSelector + encodedArgs
}
