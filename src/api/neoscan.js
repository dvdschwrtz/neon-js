import axios from 'axios'
import { Balance } from '../wallet'
import { ASSETS } from '../consts'

/**
 * Returns the appropriate NeoScan endpoint.
 * @param {string} net - 'MainNet', 'TestNet' or a custom NeoScan-like url.
 * @return {string} - URL
 */
export const getAPIEndpoint = (net) => {
  switch (net) {
    case 'MainNet':
      return 'https://neoscan.io/api/main_net'
    case 'TestNet':
      return 'https://neoscan-testnet.io/api/test_net'
    default:
      return net
  }
}

/**
 * Returns an appropriate RPC endpoint retrieved from a NeoScan endpoint.
 * @param {string} net - 'MainNet', 'TestNet' or a custom NeoScan-like url.
 * @return {Promise<string>} - URL
 */
export const getRPCEndpoint = (net) => {
  const apiEndpoint = getAPIEndpoint(net)
  return axios.get(apiEndpoint + '/v1/get_all_nodes')
    .then(({ data }) => {
      let bestHeight = 0
      let nodes = []
      for (const node of data) {
        if (node.height > bestHeight) {
          bestHeight = node.height
          nodes = [node]
        } else if (node.height === bestHeight) {
          nodes.push(node)
        }
      }
      return nodes[Math.floor(Math.random() * nodes.length)].url
    })
}

/**
 * Gat balances for an address.
 * @param {string} net - 'MainNet', 'TestNet' or a custom NeoScan-like url.
 * @param {string} address - Address to check.
 * @return {Balance}
  */
export const getBalance = (net, address) => {
  const apiEndpoint = getAPIEndpoint(net)
  return axios.get(apiEndpoint + '/v1/get_balance/' + address)
    .then((res) => {
      const bal = new Balance({ address: res.data.address, net })
      res.data.balance.map((b) => {
        bal.addAsset(b.asset, {
          balance: b.amount,
          unspent: parseUnspent(b.unspent)
        })
        // To be deprecated
        bal[b.asset] = {
          balance: b.amount,
          unspent: parseUnspent(b.unspent)
        }
      })
      return bal
    })
}

/**
 * Get claimable amounts for an address.
 * @param {string} net - 'MainNet', 'TestNet' or a custom NeoScan-like url.
 * @param {string} address - Address to check.
 * @return {Promise<Claim>}
 */
export const getClaims = (net, address) => {
  const apiEndpoint = getAPIEndpoint(net)
  return axios.get(apiEndpoint + '/v1/get_claimable/' + address)
    .then((res) => {
      const total_unspent_claim = res.data.unclaimed * 100000000 // might not need times 1000...
      const [total_claim, claims] = parseClaims(res.data.claimable)
      return { net, address: res.data.address, total_claim, total_unspent_claim, claims }
    })
}


/**
 * Get transaction history for an account
 * @param {string} net - 'MainNet' or 'TestNet'.
 * @param {string} address - Address to check.
 * @return {Promise<History>} History
 */
export const getTransactionHistory = (net, address) => {
  const apiEndpoint = getAPIEndpoint(net)
  return axios.get(apiEndpoint + '/v1/get_address_neon/' + address).then((response) => {
    const transactions = parseTransactions(response.data.txids)
    return transactions
  })
}

/**
 * Get the current height of the neoscan DB
 * @param {string} net - 'MainNet' or 'TestNet'.
 * @return {Promise<number>} Current height.
 */
export const getWalletDBHeight = (net) => {
  const apiEndpoint = getAPIEndpoint(net)
  return axios.get(apiEndpoint + '/v1/get_height').then((response) => {
    return parseInt(response.data.height)
  })
}

const parseUnspent = (unspentArr) => {
  return unspentArr.map((coin) => {
    return {
      index: coin.n,
      txid: coin.txid,
      value: coin.value
    }
  })
}

const parseClaims = (claimArr) => {
  let total_claim = 0

  const claims = claimArr.map((c) => {
    let claim = Math.round(c.unclaimed * 100000000)
    total_claim += claim
    return {
      start: c.start_height,
      end: c.ed_height,
      index: c.n,
      claim,
      txid: c.txid,
      value: c.value
    }
  })

  return [total_claim, claims]
}

const parseTransactions = (transactions) => {
  return transactions
    .map(({ txid, asset_moved, amount_moved, balance, block_height }) => {
      let NEO = 0
      let GAS = 0
      let gas_sent = false
      let neo_sent = false

      if (ASSETS[asset_moved] === ASSETS.NEO) {
        neo_sent = true
      } else if (ASSETS[asset_moved] === ASSETS.GAS) {
        gas_sent = true
      } else {
        // TODO handle additional assets for both APIs in the future
      }

      balance.forEach(({ asset, amount }) => {
        if (asset === ASSETS.NEO) NEO = amount
        if (asset === ASSETS.GAS) GAS = amount
      })

      return {
        txid,
        block_index: block_height,
        GAS,
        NEO,
        gas_sent,
        neo_sent
      }
    })
}
