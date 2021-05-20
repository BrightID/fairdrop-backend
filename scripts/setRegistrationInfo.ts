import {connect} from "mongoose"
import RegistrationInfo from "../models/registrationInfo"

// @ts-ignore
import {mongoDb, mongoHost, mongoPort} from "../config"

const main = async (currentRegistrationEnd: number, nextRegistrationStart:number, nextClaimStart: number) => {
  console.log(`Setting currentRegistrationEnd to ${currentRegistrationEnd}...`)
  const uri = `mongodb://${mongoHost}:${mongoPort}/${mongoDb}`
  await connect(uri)

  const res = await RegistrationInfo.updateOne(
    {},
    {
      currentRegistrationEnd,
      nextRegistrationStart,
      nextClaimStart
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
  console.log(`Set registration phases. Expects 3 arguments (all unix timestamps in milliseconds):`)
  console.log(`\t - Timestamp when current registration phase ends`)
  console.log(`\t - Timestamp when next registration phase starts`)
  console.log(`\t - Timestamp when next claim phase starts`)
  throw(`Expected 3 arguments, got ${process.argv.length - 2}`)
}
const currentRegistrationEnd = parseInt(process.argv[2])
const nextRegistrationStart = parseInt(process.argv[3])
const nextClaimStart = parseInt(process.argv[4])

main(currentRegistrationEnd, nextRegistrationStart, nextClaimStart)
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

