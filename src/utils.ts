// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.
import { Buffer } from "node:buffer";
import Spinner from "https://deno.land/x/cli_spinners@v0.0.2/mod.ts";

/** Convert a number or bigint to a Uint8Array for RLP encoding. */
export function intToBuffer(num: number | bigint): Uint8Array {
  if (typeof num === "number") {
    if (num === 0) return new Uint8Array([]);
    let hex = num.toString(16);
    if (hex.length % 2 === 1) hex = "0" + hex;
    return new Uint8Array(Buffer.from(hex, "hex"));
  } else {
    if (num === 0n) return new Uint8Array([]);
    let hex = num.toString(16);
    if (hex.length % 2 === 1) hex = "0" + hex;
    return new Uint8Array(Buffer.from(hex, "hex"));
  }
}

/** Convert any input to a Uint8Array for RLP encoding. */
export function toBuffer(input: unknown): Uint8Array {
  if (input instanceof Uint8Array) return input;
  if (typeof input === "string") {
    if (input.startsWith("0x")) {
      const hex = input.slice(2);
      return new Uint8Array(Buffer.from(hex, "hex"));
    } else {
      return new Uint8Array(Buffer.from(input, "utf8"));
    }
  }
  if (typeof input === "number" || typeof input === "bigint") {
    return intToBuffer(input);
  }
  throw new Error("Unsupported type for conversion to Buffer");
}

/** Encode the length for RLP encoding. */
export function encodeLength(len: number): Uint8Array {
  let hex = len.toString(16);
  if (hex.length % 2 === 1) hex = "0" + hex;
  return new Uint8Array(Buffer.from(hex, "hex"));
}

/** Convert a hex string (with "0x") to a Uint8Array. */
export function hexToBuffer(hex: string): Uint8Array {
  if (hex.startsWith("0x")) hex = hex.slice(2);
  return new Uint8Array(Buffer.from(hex, "hex"));
}

/** Parse a string amount to a bigint based on the given decimals. */
export function parseUnits(amount: string, decimals: number): bigint {
  const parts = amount.split(".");
  const whole = parts[0];
  let fraction = parts[1] || "";
  if (fraction.length > decimals) {
    fraction = fraction.slice(0, decimals);
  }
  while (fraction.length < decimals) {
    fraction += "0";
  }
  return BigInt(whole + fraction);
}

export const spinner = Spinner.getInstance();

// 先頭のゼロバイトを取り除くヘルパー関数を追加
export function stripLeadingZeros(buffer: Uint8Array): Uint8Array {
  let i = 0;
  while (i < buffer.length && buffer[i] === 0) {
    i++;
  }
  return buffer.slice(i);
}
