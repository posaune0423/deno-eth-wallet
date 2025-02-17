// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { crypto } from 'jsr:@std/crypto'
import { Buffer } from 'node:buffer'
import Spinner from 'https://deno.land/x/cli_spinners@v0.0.2/mod.ts'

/** Convert a number or bigint to a Uint8Array for RLP encoding. */
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

/** Convert any input to a Uint8Array for RLP encoding. */
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

/** Encode the length for RLP encoding. */
export function encodeLength(len: number): Uint8Array {
  let hex = len.toString(16)
  if (hex.length % 2 === 1) hex = '0' + hex
  return new Uint8Array(Buffer.from(hex, 'hex'))
}

/** Perform a simple RLP encoding of the input. */
export function rlpEncode(input: unknown): Uint8Array {
  if (Array.isArray(input)) {
    const encodedElements = input.map((item) => rlpEncode(item))
    const concatenated = new Uint8Array(
      Buffer.concat(encodedElements.map((buf) => Buffer.from(buf)))
    )
    if (concatenated.length < 56) {
      return new Uint8Array(
        Buffer.concat([
          Buffer.from([0xc0 + concatenated.length]),
          Buffer.from(concatenated),
        ])
      )
    } else {
      const lenBuf = encodeLength(concatenated.length)
      return new Uint8Array(
        Buffer.concat([
          Buffer.from([0xf7 + lenBuf.length]),
          Buffer.from(lenBuf),
          Buffer.from(concatenated),
        ])
      )
    }
  } else {
    const buf = toBuffer(input)
    if (buf.length === 1 && buf[0] < 0x80) return buf
    if (buf.length < 56) {
      return new Uint8Array(
        Buffer.concat([Buffer.from([0x80 + buf.length]), Buffer.from(buf)])
      )
    } else {
      const lenBuf = encodeLength(buf.length)
      return new Uint8Array(
        Buffer.concat([
          Buffer.from([0xb7 + lenBuf.length]),
          Buffer.from(lenBuf),
          Buffer.from(buf),
        ])
      )
    }
  }
}

/** Convert a hex string (with "0x") to a Uint8Array. */
export function hexToBuffer(hex: string): Uint8Array {
  if (hex.startsWith('0x')) hex = hex.slice(2)
  return new Uint8Array(Buffer.from(hex, 'hex'))
}

/** Parse a string amount to a bigint based on the given decimals. */
export function parseUnits(amount: string, decimals: number): bigint {
  const parts = amount.split('.')
  const whole = parts[0]
  let fraction = parts[1] || ''
  if (fraction.length > decimals) {
    fraction = fraction.slice(0, decimals)
  }
  while (fraction.length < decimals) {
    fraction += '0'
  }
  return BigInt(whole + fraction)
}

/**
 * Message 型: 文字列、number の配列、ArrayBuffer、または Uint8Array を受け入れます。
 */
export type Message = string | number[] | ArrayBuffer | Uint8Array

/**
 * 入力を Uint8Array に変換するユーティリティ関数。
 *
 * @param message - 変換するメッセージ。
 * @returns Uint8Array に変換した結果。
 */
function toUint8Array(message: Message): Uint8Array {
  if (typeof message === 'string') {
    // 文字列の場合は UTF-8 エンコード
    return new TextEncoder().encode(message)
  } else if (message instanceof ArrayBuffer) {
    return new Uint8Array(message)
  } else if (message instanceof Uint8Array) {
    return message
  } else if (Array.isArray(message)) {
    return new Uint8Array(message)
  } else {
    throw new Error('Unsupported message type')
  }
}

/**
 * KECCAK-256 を計算するラッパー関数。
 *
 * @param message - ハッシュ化するデータ。型は Message。
 * @returns Promise<string> ハッシュ値の16進数文字列。
 */
export async function keccak256(message: Message): Promise<string> {
  // 入力を Uint8Array に変換
  const data = toUint8Array(message)
  // Deno.std/crypto がサポートしているアルゴリズム名 "KECCAK-256" を指定してハッシュ計算
  const hashBuffer = await crypto.subtle.digest('KECCAK-256', data)
  // ArrayBuffer を Uint8Array に変換し、16進数文字列にする
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

export const spinner = Spinner.getInstance()

// 先頭のゼロバイトを取り除くヘルパー関数を追加
export function stripLeadingZeros(buffer: Uint8Array): Uint8Array {
  let i = 0
  while (i < buffer.length && buffer[i] === 0) {
    i++
  }
  return buffer.slice(i)
}
