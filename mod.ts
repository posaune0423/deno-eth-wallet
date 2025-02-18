// Copyright 2018-2025 the Deno authors. All rights reserved. MIT license.

import { Command } from 'https://deno.land/x/cliffy@v0.25.7/command/mod.ts'
import * as path from 'https://deno.land/std@0.177.0/path/mod.ts'
import { Wallet } from './src/wallet.ts'
import { RpcClient } from './src/rpc_client.ts'
import { spinner } from './src/utils.ts'
import { encodeFunctionCall } from './src/abi_encoder.ts'
import { Address, Transaction } from './src/types.ts'
import { parseEther } from 'https://esm.sh/viem'

const WALLET_FILE = path.join(Deno.cwd(), 'wallet.json')

/**
 * ウォレット情報をファイルに保存する関数。
 */
async function saveWalletToFile(wallet: Wallet): Promise<void> {
  const data = JSON.stringify(
    {
      mnemonic: wallet.mnemonic,
      privateKey: wallet.privateKey,
      address: wallet.address,
    },
    null,
    2,
  )
  await Deno.writeTextFile(WALLET_FILE, data)
  console.log('Wallet saved to', WALLET_FILE)
}

/**
 * ウォレット情報をファイルから読み込む関数。
 */
async function loadWalletFromFile(): Promise<Wallet> {
  try {
    const data = await Deno.readTextFile(WALLET_FILE)
    const obj = JSON.parse(data)
    return new Wallet(obj.mnemonic, obj.privateKey, obj.address)
  } catch {
    console.error(
      "Wallet file not found. Create a wallet first using the 'create' command",
    )
    Deno.exit(1)
  }
}

await new Command()
  .name('wallet')
  .description('CLI Ethereum Wallet (Deno)')
  .version('0.2.0')
  // create コマンド
  .command(
    'create',
    new Command()
      .description(
        '新しいウォレットを作成する (ミニモニック, 秘密鍵, アドレス)',
      )
      .action(async () => {
        const wallet = await Wallet.create()
        console.log('Address:', wallet.address)
        console.log('Mnemonic:', wallet.mnemonic)
        console.log('Private Key:', wallet.privateKey)
        await saveWalletToFile(wallet)
      }),
  )
  // show コマンド
  .command(
    'show',
    new Command().description('ウォレット情報を表示する').action(async () => {
      const wallet = await loadWalletFromFile()
      console.log('Address:', wallet.address)
      console.log('Mnemonic:', wallet.mnemonic)
      console.log('Private Key:', wallet.privateKey)
    }),
  )
  // send コマンド (ETH 送金)
  .command(
    'send',
    new Command()
      .description('ETH トランザクションを送信する')
      .option('-t, --to <address:string>', '送信先アドレス')
      .option('-v, --value <value:string>', '送金する ETH の量 (ether 単位)')
      .option('-r, --rpc <rpcUrl:string>', 'RPC URL', {
        default: 'http://localhost:8545',
      })
      .action(async (opts) => {
        if (!opts.to || !opts.value) {
          console.error('To address and value are required')
          Deno.exit(1)
        }

        const wallet = await loadWalletFromFile()
        const rpc = new RpcClient(opts.rpc)

        const nonce = await rpc.getNonce(wallet.address)
        const gasPrice = await rpc.getGasPrice()
        const chainId = await rpc.getChainId()
        const value = parseEther(opts.value)

        const txForEstimate = {
          from: wallet.address,
          to: opts.to,
          data: '0x',
          value: '0x0',
        }

        // ガス計算
        let gasLimit: bigint
        try {
          gasLimit = await rpc.estimateGas(txForEstimate)
        } catch {
          console.error('Error estimating gas, using default 21000')
          gasLimit = 21000n
        }

        const tx: Transaction = {
          nonce,
          gasPrice,
          gasLimit,
          to: opts.to as Address,
          value,
          data: '0x',
          chainId,
        }

        // ウォレットのインスタンスメソッドを使用して署名
        const rawTx = await wallet.sign(tx)
        console.log('Raw Transaction:', rawTx)
        try {
          spinner.start('Sending transaction...')
          const txHash = await rpc.sendRawTransaction(rawTx)
          spinner.succeed('Transaction sent successfully')
          console.log('Transaction Hash:', txHash)
        } catch (err) {
          spinner.fail('Transaction failed')
          console.error('Error sending transaction:', err)
        }
      }),
  )
  // contract-call コマンド (スマートコントラクト呼び出し)
  .command(
    'contract-call',
    new Command()
      .description('スマートコントラクト関数を呼び出す')
      .option('-c, --contract <address:string>', 'コントラクトアドレス')
      .option('-a, --abi <file:string>', 'ABI JSON ファイル')
      .option('-f, --function <name:string>', '呼び出す関数名')
      .option('-p, --params <json:string>', '関数パラメータ (JSON 配列形式)')
      .option('-v, --value <value:string>', '送金する ETH の量 (default 0)', {
        default: '0',
      })
      .option('-r, --rpc <rpcUrl:string>', 'RPC URL', {
        default: 'http://localhost:8545',
      })
      .action(async (opts) => {
        if (!opts.abi || !opts.function) {
          console.error('ABI file and function name are required')
          Deno.exit(1)
        }
        const wallet = await loadWalletFromFile()
        const rpc = new RpcClient(opts.rpc)
        try {
          const abiText = await Deno.readTextFile(opts.abi)
          const abi = JSON.parse(abiText)
          let params: unknown[] = []
          if (opts.params) {
            params = JSON.parse(opts.params)
            if (!Array.isArray(params)) {
              throw new Error('Params must be a JSON array')
            }
          }
          const data = await encodeFunctionCall(abi, opts.function, params)
          const nonce = await rpc.getNonce(wallet.address)
          const gasPrice = await rpc.getGasPrice()
          const chainId = await rpc.getChainId()
          const txForEstimate = {
            from: wallet.address,
            to: opts.contract,
            data: data,
            value: '0x0',
          }

          // ガス計算
          let gasLimit: bigint
          try {
            gasLimit = await rpc.estimateGas(txForEstimate)
          } catch {
            console.error('Error estimating gas, using default 21000')
            gasLimit = 21000n
          }

          const value = parseEther(opts.value)
          const tx: Transaction = {
            nonce,
            gasPrice,
            gasLimit,
            to: opts.contract as Address,
            value,
            data,
            chainId,
          }
          const rawTx = await wallet.sign(tx)
          console.log('Raw Transaction:', rawTx)
          try {
            spinner.start('Sending transaction...')
            const txHash = await rpc.sendRawTransaction(rawTx)
            spinner.succeed('Transaction sent successfully')
            console.log('Transaction Hash:', txHash)
          } catch (err) {
            spinner.fail('Transaction failed')
            console.error('Error sending contract call transaction:', err)
          }
        } catch (err) {
          console.error(
            'Error reading ABI file or encoding function call:',
            err,
          )
          Deno.exit(1)
        }
      }),
  )
  .parse(Deno.args)
