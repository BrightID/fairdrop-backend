import {BigNumber, ethers} from "ethers"
import {connect} from "mongoose"

// @ts-ignore
import {mongoDb, mongoHost, mongoPort} from "../config"
import AddressInfo from "../models/AddressInfo"

const main = async (rawAddress: string, amount: string) => {
  console.log(`Setting nextAmount for ${rawAddress} to ${amount}`)

  // make sure address is checksummed
  const address = ethers.utils.getAddress(rawAddress)

  const uri = `mongodb://${mongoHost}:${mongoPort}/${mongoDb}`
  await connect(uri)

  const res = await AddressInfo.updateOne(
    {
      address: address
    },
    {
      nextAmount: amount
    },
    { upsert: true }
  )
  if (res) {
    console.log(`Found ${res.n} entries, updated ${res.nModified} entries.`)
  } else {
    console.log(`No doc!`)
  }
}


if (process.argv.length !== 4) {
  console.log(`Set next amount for an address. Expects 2 arguments:`)
  console.log(`\t - Eth address to update`)
  console.log(`\t - Amount (in baseunits)`)
  throw(`Expected 2 arguments, got ${process.argv.length - 2}`)
}

const address = process.argv[2]
const amount = process.argv[3]


main(address, amount)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

