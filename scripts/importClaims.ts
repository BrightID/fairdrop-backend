import {readFile} from "fs/promises"
import {connect} from "mongoose"
import ClaimInfo from "../models/ClaimInfo"

// @ts-ignore
import {mongoDb, mongoHost, mongoPort} from "../config"

const loadClaimData = async (claimfile: string) => {
  try {
    return JSON.parse(await readFile(claimfile, "utf8"));
  } catch (e) {
    console.log(`Failed to load claimData from ${claimfile}`)
    console.log(e)
    console.log(e.message)
    return null
  }
}

const main = async (filepath: string) => {
  console.log(`Importing claimfile from ${filepath}`)

  const uri = `mongodb://${mongoHost}:${mongoPort}/${mongoDb}`
  await connect(uri)

  // open file
  const jsonClaim = await loadClaimData(filepath)
  console.log(`Opened claimfile ${filepath}. ChainId: ${jsonClaim.chainId} - MerkleRoot: ${jsonClaim.root}`)

  for (const entry of jsonClaim.data) {
    console.log(`Processing entry ${entry.index}...`)
    const claimInfo = await ClaimInfo.create({
      address: entry.address,
      chainId: jsonClaim.chainId,
      leaf: JSON.stringify(entry)
    })
    console.log(`Created claimInfo ${claimInfo.address} - ${claimInfo.chainId}`)
  }
}


if (process.argv.length !== 3) {
  console.log(`Import merkletree. Expects one argument path/to/airdropData.json`)
  throw(`Expected 1 arguments, got ${process.argv.length - 2}`)
}

const filepath = process.argv[2]

main(filepath)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

