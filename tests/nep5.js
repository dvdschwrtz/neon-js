import * as NEP5 from '../src/nep5'
import { doMintTokens } from '../src/api'

describe('NEP5', function () {
  const net = 'TestNet'
  const scriptHash = 'd7678dd97c000be3f33e9362e673101bac4ca654'
  const mintedAddress = 'ALw4RsYohc9Kp6whudKbSMr44S12XbTXeh'
  const toAddress = 'ALq7AWrhAueN6mJNqk6FHJjnsEoPRytLdW'
  const fromWif = 'L5FzBMGSG2d7HVJL5vWuXfxUKsrkX5irFhtw1L5zU4NAvNuXzd8a'
  const neo = 1
  const gasCost = 0

  // before(function (done) {
  //   doMintTokens(net, scriptHash, fromWif, neo, gasCost).then(res => {
  //     done()
  //   }).catch(e => done.fail(e))
  // })
  this.timeout(10000)
  it('get basic info', () => {
    return NEP5.getTokenInfo(net, scriptHash)
      .then(result => {
        result.name.should.equal('LOCALTOKEN')
        result.symbol.should.equal('LWTF')
        result.decimals.should.equal(8)
        result.totalSupply.should.equal(1969000)
      })
      .catch((e) => {
        console.log(e)
        throw e
      })
  })
  it('get balance', () => {
    return NEP5.getTokenBalance(net, scriptHash, toAddress)
      .then(result => {
        result.should.be.above(0)
      })
      .catch((e) => {
        console.log(e)
        throw e
      })
  })
  // it('transfers tokens', () => {
  //   const transferAmount = 3
  //   return NEP5.doTransferToken(net, scriptHash, fromWif, toAddress, transferAmount, gasCost)
  //     .then(({ result }) => {
  //       result.should.equal(true)
  //     })
  //     .catch((e) => {
  //       console.log(e)
  //       throw e
  //     })
  // })
})
