import {connect} from "mongoose"
import AddressInfo from "../models/AddressInfo"

// @ts-ignore
import {mongoDb, mongoHost, mongoPort} from "../config"

const main = async () => {

  const uri = `mongodb://${mongoHost}:${mongoPort}/${mongoDb}`
  await connect(uri)

  const res = await AddressInfo.find()
  if (res) {
    console.log(`Found ${res.length} entries`)
    console.log(`address,chainId`)
    let mainNetCounter = 0;
    let xDaiCounter = 0;
    for (const entry of res) {
      switch(entry.chainId) {
        case 1:
          mainNetCounter++;
          break;
        case 100:
          console.log(`${entry.address.toLowerCase()}`)
          xDaiCounter++;
          break;
        default:
          throw(`Unhandled chainID ${entry.chainId}`)
      }
    }
    console.log(`xDAI: ${xDaiCounter}`)
    console.log(`mainNet: ${mainNetCounter}`)
  } else {
    console.log(`No doc!`)
  }
}


if (process.argv.length !== 2) {
  throw(`Expected 0 arguments, got ${process.argv.length - 2}`)
}


main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

