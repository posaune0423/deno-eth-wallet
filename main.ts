// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { Command } from 'https://deno.land/x/cliffy@v0.25.7/command/mod.ts'
import * as path from 'jsr:@std/path'
import { Wallet } from './src/wallet.ts'
import { RpcClient } from './src/rpc_client.ts'
import { parseUnits, spinner } from './src/utils.ts'
import { encodeFunctionCall } from './src/abi_encoder.ts'
import { sign } from './src/signature.ts'
import { Transaction } from './src/type.ts'

const WALLET_FILE = path.join(Deno.cwd(), 'wallet.json')

/** Saves the wallet to a file. */
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

/** Loads the wallet from a file. */
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
      .description('Create a new wallet (mnemonic, private key, address)')
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
    new Command()
      .description('Show wallet information')
      .option('-r, --rpc <rpcUrl:string>', 'RPC URL', {
        default: 'http://localhost:8545',
      })
      .action(async (opts) => {
        const wallet = await loadWalletFromFile()
        const rpc = new RpcClient(opts.rpc)
        const balance = await rpc.getBalance(wallet.address)
        console.log('🪪 Address:', wallet.address)
        console.log('🪙 Balance:', Number(balance) / 10 ** 18)
      }),
  )
  // send コマンド (ETH 送金)
  .command(
    'send',
    new Command()
      .description('Send ETH transaction')
      .option('-t, --to <address:string>', 'Recipient address')
      .option('-v, --value <value:string>', 'Amount of ETH to send (in ether)')
      .option('-r, --rpc <rpcUrl:string>', 'RPC URL', {
        default: 'http://localhost:8545',
      })
      .action(async (opts) => {
        if (!opts.to || !opts.value) {
          console.error(
            'Missing required options: --to and --value are required',
          )
          Deno.exit(1)
        }
        console.log('opts.rpc:', opts.rpc)
        const wallet = await loadWalletFromFile()
        console.log('wallet.address:', wallet.address)
        const rpc = new RpcClient(opts.rpc)
        const balance = await rpc.getBalance(wallet.address)
        console.log('eth.getBalance():', Number(balance) / 10 ** 18)
        const nonce = await rpc.getNonce(wallet.address)
        const gasPrice = await rpc.getGasPrice()
        const value = parseUnits(opts.value, 18)
        const chainId = await rpc.getChainId()

        const txForEstimate = {
          from: wallet.address,
          to: opts.to,
          value,
          data: '0x',
          chainId,
        }
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
          to: opts.to,
          value,
          data: '0x',
          chainId,
        }
        console.log(tx)
        console.log(gasLimit * gasPrice)

        const rawTx = sign(wallet.privateKey, tx)
        console.log('Raw Transaction:', rawTx)
        try {
          spinner.start('Sending transaction...')

          const txHash = await rpc.sendRawTransaction(rawTx)
          spinner.succeed('Transaction sent successfully')
          console.log('Transaction Hash:', txHash)
        } catch (err) {
          spinner.fail('Error sending transaction')
          console.error('Error sending transaction:', err)
        }
      }),
  )
  // contract-call コマンド
  .command(
    'contract-call',
    new Command()
      .description('Call a smart contract function')
      .option('-c, --contract <address:string>', 'Contract address')
      .option('-a, --abi <file:string>', 'ABI JSON file')
      .option('-f, --function <name:string>', 'Function name')
      .option('-p, --params <json:string>', 'Function parameters as JSON array')
      .option(
        '-v, --value <value:string>',
        'Amount of ETH to send (default 0)',
        { default: '0' },
      )
      .option('-r, --rpc <rpcUrl:string>', 'RPC URL', {
        default: 'http://localhost:8545',
      })
      .action(async (opts) => {
        if (!opts.contract || !opts.abi || !opts.function) {
          console.error(
            'Missing required options: --contract, --abi, and --function are required',
          )
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
          let gasLimit: bigint
          try {
            gasLimit = await rpc.estimateGas(txForEstimate)
          } catch {
            console.error('Error estimating gas, using default 100000')
            gasLimit = 100000n
          }
          const value = parseUnits(opts.value, 18)
          const tx: Transaction = {
            nonce,
            gasPrice,
            gasLimit,
            to: opts.contract,
            value,
            data,
            chainId,
          }

          const rawTx = sign(wallet.privateKey, tx)
          console.log('Raw Transaction:', rawTx)
          try {
            const txHash = await rpc.sendRawTransaction(rawTx)
            console.log('Transaction Hash:', txHash)
          } catch (err) {
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
