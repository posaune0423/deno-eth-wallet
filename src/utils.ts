// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.
import { Buffer } from 'node:buffer'
import Spinner from 'https://deno.land/x/cli_spinners@v0.0.2/mod.ts'

export const spinner = Spinner.getInstance()

/**
 * 数値または bigint を RLP エンコード用の Uint8Array に変換する。
 */
export function intToBuffer(num: number | bigint): Uint8Array {
  if (typeof num === 'number') {
    if (num === 0) return new Uint8Array([])
    let hex = num.toString(16)
    if (hex.length % 2 === 1) hex = '0' + hex
    return new Uint8Array(Buffer.from(hex, 'hex'))
  } else {
    if (num === 0n) return new Uint8Array([])
    let hex = num.toString(16)
    if (hex.length % 2 === 1) hex = '0' + hex
    return new Uint8Array(Buffer.from(hex, 'hex'))
  }
}

/**
 * 入力値を Uint8Array に変換する。
 */
export function toBuffer(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) return input
  if (typeof input === 'string') {
    if (input.startsWith('0x')) {
      const hex = input.slice(2)
      return new Uint8Array(Buffer.from(hex, 'hex'))
    } else {
      return new Uint8Array(Buffer.from(input, 'utf8'))
    }
  }
  if (typeof input === 'number' || typeof input === 'bigint') {
    return intToBuffer(input)
  }
  throw new Error('Unsupported type for conversion to Buffer')
}

/** "0x" プレフィックス付きの 16 進文字列を Uint8Array に変換する。 */
export function hexToBuffer(hex: string): Uint8Array {
  if (hex.startsWith('0x')) hex = hex.slice(2)
  return new Uint8Array(Buffer.from(hex, 'hex'))
}
