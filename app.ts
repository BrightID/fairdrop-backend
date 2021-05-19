import {BigNumber, ethers} from "ethers"
import {verifyMessage} from "ethers/lib/utils"
import express from "express"
import NodeCache from "node-cache"
import cors from "cors"

const app = express()

/* Middleware */
// parse body as json
app.use(express.json())
// Enable CORS - allow any host to talk to this api
// TODO - Should CORS setup be more strict?
app.use(cors())


// dummy in-memory database for now
const database = new NodeCache({stdTTL: 3600, checkperiod: 120})

// dummy phase info
const inSomeMinutes = Date.now()+(60*1000)*1
database.set('currentRegistrationEnd', inSomeMinutes )
database.set('nextClaimStart', inSomeMinutes +(60*1000*120) ) // airdrop update will take about 2 hours
// database.set('nextRegistrationStart', inSomeMinutes +(60*1000*120) ) // Next registration phase will start together with airdrop update
database.set('nextRegistrationStart', 0 ) // There will be no next registration period

interface addressEntry {
  chainId: number,
  nextAmount: BigNumber,
}

/**
 * Get info about registration phase
 * -> When does current registration phase end
 * -> When will next phase start
 */
app.get("/registrationInfo", (request, response, next) => {
  const currentRegistrationEnd = database.get('currentRegistrationEnd')
  const nextRegistrationStart = database.get('nextRegistrationStart')
  const nextClaimStart = database.get('nextClaimStart')
  response.json({
    currentRegistrationEnd,
    nextRegistrationStart,
    nextClaimStart
  })
})

/**
 * Get info about an address
 *
 * Response body:
 * {
 *   chainId: <desired payout chainId, defaults to mainnet>,
 *   nextAmount: <expected amount for next airdrop phase>
 * }
 */
app.get("/address/:rawAddress", (request, response, next) => {
  const {rawAddress} = request.params
  if (!rawAddress) {
    response.status(400).json({error: "missing address"})
    return
  }

  // verify address
  let checksummedAddress:string
  try {
    checksummedAddress = ethers.utils.getAddress(rawAddress)
  } catch(e) {
    response.status(400).json({error: "invalid address"})
    return
  }

  // lookup address details in database
  const entry:addressEntry|undefined = database.get(checksummedAddress)
  // fallback to mainnet
  const chainId = entry?.chainId || 1
  // fallback to 0 amount
  const nextAmount = entry?.nextAmount || BigNumber.from(0)

  response.json({
    chainId,
    nextAmount
  })
})

/**
 * Set the payout chainId for an address.
 *
 * Expected body:
 * {
 *   "chainId": 123,
 *   "signature": "signature string"
 * }
 */
app.post("/address/:rawAddress", (request, response, next) => {
  const {rawAddress} = request.params
  const {chainId, signature} = request.body

  // verify address
  if (!rawAddress) {
    response.status(400).json({error: "missing address"})
    return
  }
  let checksummedAddress:string
  try {
    checksummedAddress = ethers.utils.getAddress(rawAddress)
  } catch(e) {
    response.status(400).json({error: "invalid address"})
    return
  }

  // verify chainId
  if (!chainId) {
    response.status(400).json({error: "missing chainId"})
    return
  }
  if (typeof chainId !== "number") {
    response.status(400).json({error: "invalid chainId"})
    return
  }

  // verify signature
  if (!signature) {
    response.status(400).json({error: "missing signature"})
    return
  }
  if (typeof signature !== "string") {
    response.status(400).json({error: "invalid signature"})
    return
  }
  const signedMessage = `Set chainId for ${checksummedAddress} to ${chainId}`
  let signerAddress: string
  try {
    signerAddress = verifyMessage(signedMessage, signature)
  } catch(e) {
    response.status(400).json({error:"signature not matching"})
    return
  }
  if (signerAddress !== checksummedAddress) {
    response.status(400).json({error:"signature not matching"})
    return
  }

  // store new chainId
  database.set(checksummedAddress, {chainId})
  response.json({ success: true });
})

app.get("/", (req, res) => res.send("Fairdrop backend server!"))

export default app
