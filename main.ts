// Copyright 2018-2024 the Deno authors. All rights reserved. MIT license.

import { Command } from 'https://deno.land/x/cliffy@v0.25.7/command/mod.ts'
import { Wallet } from './src/wallet.ts'
import Spinner from 'https://deno.land/x/cli_spinners@v0.0.2/mod.ts'
import { privateKeyToAccount } from 'https://esm.sh/viem@2.23.2/accounts'
import {
  http,
  extractChain,
  createPublicClient,
  createWalletClient,
  parseEther,
} from 'https://esm.sh/viem@2.23.2'
import {
  sepolia,
  holesky,
  baseSepolia,
} from 'https://esm.sh/viem@2.23.2/chains'

const spinner = Spinner.getInstance()
const chains = [sepolia, holesky, baseSepolia]

await new Command()
  .name('wallet')
  .description('CLI Ethereum Wallet (Deno)')
  .version('0.2.0')
  // create コマンド
  .command(
    'create',
    new Command()
      .description('Create a new wallet (private key, address)')
      .action(async () => {
        const wallet = Wallet.create()
        console.log('Address:', wallet.address)
        console.log('Private Key:', wallet.privateKey)
        await wallet.saveWalletToFile(wallet)
      })
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
        const wallet = await Wallet.loadWalletFromFile()

        const client = createPublicClient({
          transport: http(opts.rpc),
        })

        const balance = await client.getBalance({
          address: wallet.address,
        })

        console.log('🪪 Address:', wallet.address)
        console.log('🪙 Balance:', Number(balance) / 10 ** 18)
      })
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
            'Missing required options: --to and --value are required'
          )
          Deno.exit(1)
        }

        const wallet = await Wallet.loadWalletFromFile()
        const client = createWalletClient({
          account: privateKeyToAccount(wallet.privateKey),
          transport: http(opts.rpc),
        })

        const chainId = await client.getChainId()

        const chain = extractChain({
          chains,
          id: chainId as 84532 | 11155111 | 17000,
        })

        try {
          spinner.start('Sending transaction...')
          const txHash = await client.sendTransaction({
            to: opts.to as `0x${string}`,
            value: parseEther(opts.value),
            chain,
          })
          spinner.succeed('Transaction sent successfully')
          console.log('Transaction Hash:', txHash)
        } catch (err) {
          spinner.fail('Error sending transaction')
          console.error('Error sending transaction:', err)
        }
      })
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
        { default: '0' }
      )
      .option('-r, --rpc <rpcUrl:string>', 'RPC URL', {
        default: 'http://localhost:8545',
      })
      .action(async (opts) => {
        if (!opts.contract || !opts.abi || !opts.function) {
          console.error(
            'Missing required options: --contract, --abi, and --function are required'
          )
          Deno.exit(1)
        }

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

          try {
            spinner.start('Calling contract function...')
            if (opts.value) {
              const wallet = await Wallet.loadWalletFromFile()
              const client = createWalletClient({
                account: privateKeyToAccount(wallet.privateKey),
                transport: http(opts.rpc),
              })
              const chainId = await client.getChainId()
              const chain = extractChain({
                chains,
                id: chainId as 84532 | 11155111 | 17000,
              })
              client.writeContract({
                address: opts.contract as `0x${string}`,
                abi,
                functionName: opts.function,
                args: params,
                chain,
              })
            } else {
              const client = createPublicClient({
                transport: http(opts.rpc),
              })
              client.readContract({
                address: opts.contract as `0x${string}`,
                abi,
                functionName: opts.function,
                args: params,
              })
            }
            spinner.succeed('Contract function called successfully')
          } catch (err) {
            spinner.fail('Error sending contract call transaction')
            console.error('Error sending contract call transaction:', err)
          }
        } catch (err) {
          spinner.fail('Error reading ABI file or encoding function call')
          console.error(
            'Error reading ABI file or encoding function call:',
            err
          )
          Deno.exit(1)
        }
      })
  )
  .parse(Deno.args)
