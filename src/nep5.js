import ScriptBuilder from './sc/scriptBuilder.js'
import { getScriptHashFromAddress, getAccountFromWIFKey } from './wallet'
import { doInvokeScript, parseVMStack, getBalance, queryRPC } from './api'
import { reverseHex, fixed82num } from './utils'
import * as tx from './transactions/index.js'

/**
 * Queries for NEP5 Token information.
 * @param {string} net
 * @param {string} scriptHash
 * @return {Promise<{name: string, symbol: string, decimals: number, totalSupply: number}>}
 */
export const getTokenInfo = (net, scriptHash) => {
  const sb = new ScriptBuilder()
  sb
    .emitAppCall(scriptHash, 'name')
    .emitAppCall(scriptHash, 'symbol')
    .emitAppCall(scriptHash, 'decimals')
    .emitAppCall(scriptHash, 'totalSupply')
  const script = sb.str
  return doInvokeScript(net, script, false)
    .then((res) => {
      const [name, symbol, decimals] = parseVMStack(res.stack.slice(0, 3))
      // totalSupply is parsed as Fixed8
      const totalSupply = (fixed82num(res.stack[3].value))
      return { name, symbol, decimals, totalSupply }
    })
}

/**
 * Get the token balance of Address from Contract
 * @param {string} net
 * @param {string} scriptHash
 * @param {string} address
 * @return {number}
 */
export const getTokenBalance = (net, scriptHash, address) => {
  const addrScriptHash = reverseHex(getScriptHashFromAddress(address))
  const sb = new ScriptBuilder()
  const script = sb.emitAppCall(scriptHash, 'balanceOf', [addrScriptHash]).str
  return doInvokeScript(net, script, false)
    .then((res) => {
      return fixed82num(res.stack[0].value)
    })
}

/**
 * Transfers NEP5 Tokens.
 * @param {string} net
 * @param {string} scriptHash
 * @param {string} fromWif
 * @param {string} toAddress
 * @param {number} transferAmount
 * @param {number} gasCost
 * @return {Promise<{name: string, symbol: string, decimals: number, totalSupply: number}>}
 */
export const doTransferToken = (net, scriptHash, fromWif, toAddress, transferAmount, gasCost = 0) => {
  const account = getAccountFromWIFKey(fromWif)
  return getBalance(net, account.address).then((balances) => {
    const fromAddrScriptHash = reverseHex(getScriptHashFromAddress(account.address))
    const intents = [
      { assetId: tx.ASSETS['GAS'], value: 0.1, scriptHash: fromAddrScriptHash }
    ]
    const toAddrScriptHash = reverseHex(getScriptHashFromAddress(toAddress))
    const invoke = { scriptHash, operation: 'transfer', args: [fromAddrScriptHash, toAddrScriptHash, transferAmount] }
    const unsignedTx = tx.create.invocation(account.publicKeyEncoded, balances, intents, invoke, gasCost, { version: 1 })
    const signedTx = tx.signTransaction(unsignedTx, account.privateKey)
    const hexTx = tx.serializeTransaction(signedTx)
    return queryRPC(net, 'sendrawtransaction', [hexTx], 4)
  })
}
