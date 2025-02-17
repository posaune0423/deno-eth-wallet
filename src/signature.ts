import { hexToBuffer, intToBuffer } from './utils.ts'
import { ec as EC } from 'https://esm.sh/elliptic@6.5.4?target=deno'
import { Transaction } from './type.ts'
import { encodeRlp, keccak256 } from 'https://esm.sh/ethers'

const secp256k1 = new EC('secp256k1')

/**
 * 指定された秘密鍵でトランザクションに署名する。
 * @param privateKey - 秘密鍵 (hex 文字列)。
 * @returns 生署名済みトランザクション (hex 文字列)。
 */
export function sign(privateKey: string, tx: Transaction): string {
  const nonceBuf = intToBuffer(tx.nonce)
  const gasPriceBuf = intToBuffer(tx.gasPrice)
  const gasLimitBuf = intToBuffer(tx.gasLimit)
  const toBuf = tx.to ? hexToBuffer(tx.to) : new Uint8Array([])
  const valueBuf = intToBuffer(tx.value)
  const dataBuf = tx.data ? hexToBuffer(tx.data) : new Uint8Array([])
  const chainIdBuf = intToBuffer(tx.chainId)
  // EIP‑155 対応のため、署名前の RLP 配列は [nonce, gasPrice, gasLimit, to, value, data, chainId, 0, 0]
  const rlpArray = [
    nonceBuf,
    gasPriceBuf,
    gasLimitBuf,
    toBuf,
    valueBuf,
    dataBuf,
    chainIdBuf,
    new Uint8Array([]),
    new Uint8Array([]),
  ]
  const encoded = encodeRlp(rlpArray)
  const msgHash = hexToBuffer(keccak256(encoded))
  const keyPair = secp256k1.keyFromPrivate(privateKey.slice(2), 'hex')
  const sig = keyPair.sign(msgHash, { canonical: true })
  const r = sig.r.toArrayLike(Uint8Array, 'be', 32)
  const s = sig.s.toArrayLike(Uint8Array, 'be', 32)
  const recoveryParam = sig.recoveryParam // 0 または 1

  if (recoveryParam === null) {
    throw new Error('recoveryParam is null')
  }

  const v = BigInt(tx.chainId) * 2n + 35n + BigInt(recoveryParam)
  const vBuf = intToBuffer(v)
  const signedArray = [
    nonceBuf,
    gasPriceBuf,
    gasLimitBuf,
    toBuf,
    valueBuf,
    dataBuf,
    vBuf,
    r,
    s,
  ]
  const signedEncoded = encodeRlp(signedArray)
  return signedEncoded
}
