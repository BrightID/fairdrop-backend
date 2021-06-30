import {ethers} from "ethers"
import {connect} from "mongoose"
import ContractAddress from "../models/ContractAddress"

// @ts-ignore
import {mongoDb, mongoHost, mongoPort} from "../config"

const main = async (chainId: number, name: string, rawAddress: string) => {
  console.log(`Setting contractAddress for ${name} on chain ${chainId} to ${rawAddress}`)

  // make sure address is checksummed
  const address = ethers.utils.getAddress(rawAddress)

  const uri = `mongodb://${mongoHost}:${mongoPort}/${mongoDb}`
  await connect(uri)

  const res = await ContractAddress.updateOne(
    {
      name,
      chainId
    },
    {
      address
    },
    { upsert: true }
  )
  if (res) {
    console.log(`Found ${res.n} entries, updated ${res.nModified} entries.`)
  } else {
    console.log(`No doc!`)
  }
}


if (process.argv.length !== 5) {
  console.log(`Set contract address. Expects 3 arguments:`)
  console.log(`\t - chainId`)
  console.log(`\t - contract name`)
  console.log(`\t - contract address`)
  throw(`Expected 3 arguments, got ${process.argv.length - 2}`)
}

const chainId = parseInt(process.argv[2], 10)
const name = process.argv[3].toLowerCase()
const address = process.argv[4]

main(chainId, name, address)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

