import { assertEquals } from "https://deno.land/std@0.177.0/testing/asserts.ts";
import { Wallet } from "../src/wallet.ts";
import { Transaction } from "../src/type.ts";
import { hexToBuffer, intToBuffer } from "../src/utils.ts";
import { sign } from "../src/signature.ts";
import { Buffer } from "https://deno.land/std@0.177.0/node/buffer.ts";
import { ec as EC } from "https://esm.sh/elliptic@6.5.4?target=deno";
import BN from "https://esm.sh/bn.js";
import { decodeRlp, encodeRlp, keccak256 } from "https://esm.sh/ethers";

const secp256k1 = new EC("secp256k1");

Deno.test(
  "Signature recovery: sign() produces signature that recovers the original wallet address",
  async () => {
    // ウォレット生成
    const wallet1 = await Wallet.create();
    const wallet2 = await Wallet.create();

    // テスト用のトランザクションオブジェクト（各フィールドは任意の値）
    const tx: Transaction = {
      nonce: 0n,
      gasPrice: 1000000000n,
      gasLimit: 21000n,
      to: wallet2.address, // シンプルに同じアドレスを指定（実際の送金先は任意）
      value: 1n,
      data: "0x",
      chainId: 1,
    };

    // sign() により生署名済みトランザクション（RLP エンコード済み文字列 "0x..."）を取得
    const signedTx = sign(wallet1.privateKey, tx);

    // RLP デコードで各フィールドに分解する
    const signedTxBytes = hexToBuffer(signedTx);
    const decoded = decodeRlp(signedTxBytes) as unknown[];
    if (decoded.length !== 9) {
      throw new Error("Unexpected decoded transaction structure");
    }
    // decoded 配列（各フィールドは Uint8Array）
    // [ nonce, gasPrice, gasLimit, to, value, data, v, r, s ]
    const vBytes = decoded[6] as Uint8Array;
    const rBytes = decoded[7] as Uint8Array;
    const sBytes = decoded[8] as Uint8Array;

    // v は数字 (BigInt) に変換
    const vHex = Buffer.from(vBytes).toString("hex") || "0";
    const v = BigInt("0x" + vHex);
    // recovery parameter の算出：ECDSA では recid = v - (chainId * 2n + 35n)
    const recid = Number(v - (BigInt(tx.chainId) * 2n + 35n));

    // 署名前のトランザクション（preimage）を再構築する
    // ※ preimage は [nonce, gasPrice, gasLimit, to, value, data, chainId, empty, empty]
    const nonceBuf = intToBuffer(tx.nonce);
    const gasPriceBuf = intToBuffer(tx.gasPrice);
    const gasLimitBuf = intToBuffer(tx.gasLimit);
    const toBuf = tx.to ? hexToBuffer(tx.to) : new Uint8Array([]);
    const valueBuf = intToBuffer(tx.value);
    const dataBuf = tx.data ? hexToBuffer(tx.data) : new Uint8Array([]);
    const chainIdBuf = intToBuffer(tx.chainId);
    const preimageArray = [
      nonceBuf,
      gasPriceBuf,
      gasLimitBuf,
      toBuf,
      valueBuf,
      dataBuf,
      chainIdBuf,
      new Uint8Array([]),
      new Uint8Array([]),
    ];
    const encodedPreimage = encodeRlp(preimageArray);
    // メッセージハッシュは keccak256(rlpEncode(preimage)) の hex を Uint8Array に変換
    const msgHash = hexToBuffer(keccak256(encodedPreimage));

    // 署名情報 (r, s) は RLP でエンコードされた 32 バイトの Uint8Array
    // elliptic ライブラリ用に BN オブジェクトへ変換
    const rBN = new BN(Buffer.from(rBytes).toString("hex"), 16);
    const sBN = new BN(Buffer.from(sBytes).toString("hex"), 16);
    const sigObj = { r: rBN, s: sBN };

    // 署名から公開鍵を復元する
    const recoveredPubKey = secp256k1.recoverPubKey(msgHash, sigObj, recid);
    const recoveredPubKeyHex = recoveredPubKey.encode("hex", false);
    // Ethereum アドレスは、uncompressed 公開鍵 (先頭 0x04 付き) の先頭バイトを除去し keccak256 を適用、
    // その下位 20 バイトを "0x" プレフィックスで表現する
    const pubKeyBuffer = Buffer.from(recoveredPubKeyHex, "hex");
    const pubKeyHash = keccak256(new Uint8Array(pubKeyBuffer.slice(1)));

    const recoveredAddress = "0x" + pubKeyHash.slice(-40);

    // 生成されたウォレットアドレスと復元されたアドレスが一致することを検証
    assertEquals(recoveredAddress.toLowerCase(), wallet1.address.toLowerCase());
  },
);
