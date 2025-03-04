# Deno Ethereum Wallet Implementation 🦕

このプロジェクトは、Deno と TypeScript を用いて構築された最小限かつモジュール化された Ethereum ウォレット CLI
アプリケーションです。\
監査済みライブラリである [@scure/bip39](https://deno.land/x/scure_bip39)（BIP39 ミニモニックフレーズ生成）および
[@scure/bip32](https://deno.land/x/scure_bip32)（HD キー派生）を活用し、BIP39 ミニモニックから HD キーを派生、Ethereum
の秘密鍵およびアドレスを生成します。\
さらに、JSON‑RPC 経由でトランザクションの生成、署名、送信、スマートコントラクト呼び出しなどの機能も備えています。

### ⚠️ 学習用に作成した開発プロジェクトです。

本番環境での使用は推奨しません。

---

## 目次

- [特徴](#特徴)
- [プロジェクト構成](#プロジェクト構成)
- [前提条件](#前提条件)
- [インストール](#インストール)
- [使い方](#使い方)
- [開発](#開発)
- [ライセンス](#ライセンス)

---

## 特徴

- **ウォレット生成**

  - [BIP39](https://iancoleman.io/bip39/) に基づくミニモニックフレーズを生成し、HD キー派生（標準パス `m/44'/60'/0'/0/0`）により秘密鍵と Ethereum
    アドレスを生成します。

- **トランザクション署名**

  - [EIP‑155](https://eips.ethereum.org/EIPS/eip-155) に対応したトランザクションの生成と署名が可能です。

- **スマートコントラクト呼び出し**

  - 最小限の ABI エンコーダを利用して、スマートコントラクトの関数呼び出し用データ（calldata）を生成します。

- **JSON‑RPC 通信**

  - ローカルおよびパブリックの Ethereum ノードと通信し、nonce、gasPrice、chainId
    の取得や生トランザクションの送信が可能です。

- **モジュール化された設計**

  - 各機能は独立したモジュールとして実装され、Deno のスタイルガイドに準拠したクリーンなコードとなっています。

- **CLI インターフェース**
  - [Cliffy](https://deno.land/x/cliffy) を使用して、ユーザーフレンドリーなコマンドライン操作を実現しています。

---

## プロジェクト構成

```bash
deno-eth-wallet
├── src/
│   ├── const.ts
│   ├── rpc_client.ts
│   ├── types.ts
│   └── wallet.ts
└── mod.ts
```

---

## セットアップ

Vscodeなどのエディタのインストール

[Deno](https://deno.land/) のインストール

```shell

# Macの場合
curl -fsSL https://deno.land/install.sh | sh

# Windowsの場合
irm https://deno.land/install.ps1 | iex
```


---

## Clone

リポジトリをクローンしてローカル環境にセットアップします。

```bash
git clone git@github.com:posaune0423/deno-eth-wallet.git
cd deno-eth-wallet
```

---

## 使い方

CLI アプリケーションとして実行する場合、以下のようにコマンドを実行できます。

**Wallet 生成**

```bash
deno task create
```

**Wallet 情報表示**

```bash
deno task show
```

**ETH 送金**

```bash
deno task send -t <TO_ADDRESS> -v <AMOUNT> -r <RPC_URL>
```

**スマートコントラクト呼び出し**

```bash
deno task contract-call -c <CONTRACT_ADDRESS> -a <CONTRACT_ABI_PATH> -f <FUNCTION_NAME> -p '[<PARAMETERS>]' -v 0 -r <RPC_URL>
```

## 参考

- https://support.metamask.io/develop/building-with-infura/javascript-typescript/how-to-send-eip1559-transactions-axios/
- [【完全保存版】BIP32 をしっかりと理解しよう！ ](https://note.com/standenglish/n/nfd15c746435f)
- [【完全保存版】BIP39 をしっかりと理解しよう！ ](https://note.com/standenglish/n/n8aea890f6286)
- [[EIP155] Ethereum ネットワークでリプレイ攻撃を防ぐ仕組みを理解しよう！](https://qiita.com/cardene/items/2526432899353e4a0225)
