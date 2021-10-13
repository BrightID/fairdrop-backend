import { BigNumber, ethers } from "ethers";
import { verifyMessage } from "ethers/lib/utils";
import express from "express";
import { connect } from "mongoose";
import cors from "cors";
import AddressInfo from "./models/AddressInfo";
import ClaimInfo from "./models/ClaimInfo";
import ContractAddress from "./models/ContractAddress";
import RegistrationInfo from "./models/registrationInfo";
// @ts-ignore
import { mongoHost, mongoPort, mongoDb } from "./config";
import { aprRouter } from "./apr";

const app = express();

/* Middleware */
// parse body as json
app.use(express.json());
// Enable CORS - allow any host to talk to this api
// TODO - Should CORS setup be more strict?
app.use(cors());

/* MongoDB */
const uri: string = `mongodb://${mongoHost}:${mongoPort}/${mongoDb}`;
connect(uri, (err: any) => {
  if (err) {
    console.log(err.message);
  } else {
    console.log("Successfully Connected!");
  }
});

/**
 * Get merkle leaf for an address
 */
app.get("/claimInfo/:rawAddress", async (request, response, next) => {
  const { rawAddress } = request.params;
  if (!rawAddress) {
    response.status(400).json({ error: "missing address" });
    return;
  }

  // verify address
  let checksummedAddress: string;
  try {
    checksummedAddress = ethers.utils.getAddress(rawAddress);
  } catch (e) {
    response.status(400).json({ error: "invalid address" });
    return;
  }

  try {
    const doc = await ClaimInfo.findOne({ address: checksummedAddress });
    if (doc) {
      console.log(
        `Found claimInfo entry: ${doc.address}, ${doc.chainId} ${doc.leaf}`
      );
      response.json({
        chainId: doc.chainId,
        leaf: doc.leaf,
      });
      return;
    } else {
      console.log(`No doc found for address ${checksummedAddress}`);
      response.status(404).json({ error: "No claim found for address" });
      return;
    }
  } catch (e) {
    console.log(`Failed to retrieve claim info for `);
    response.status(500).json({ error: "Failed to query database" });
  }
});

app.get("/contract/:chainId/:contractName", async (request, response, next) => {
  const { chainId, contractName } = request.params;
  if (!chainId) {
    response.status(400).json({ error: "missing chainId" });
    return;
  }
  if (!contractName) {
    response.status(400).json({ error: "missing contractName" });
    return;
  }
  let numericChainId: number;
  try {
    numericChainId = parseInt(chainId, 10);
  } catch (e) {
    response.status(400).json({ error: "Invalid chainId" });
    return;
  }

  try {
    const doc = await ContractAddress.findOne({
      chainId: numericChainId,
      name: contractName.toLowerCase(),
    });
    if (doc) {
      response.json({
        address: doc.address,
      });
    } else {
      response.status(404).json({ error: "Not found" });
    }
  } catch (e) {
    console.log(`Failed to retrieve contract info: ${e}`);
    response.status(500).json({ error: "Failed to query database" });
  }
});

/**
 * Get info about registration phase
 * -> When does current registration phase end
 * -> When will next phase start
 */
app.get("/registrationInfo", async (request, response, next) => {
  try {
    const doc = await RegistrationInfo.findOne();
    response.send(doc);
  } catch (err) {
    console.log(`Failed to get settings from mongodb`);
    response.send("Error");
  }
});

/**
 * Get info about an address
 *
 * Response body:
 * {
 *   chainId: <desired payout chainId, defaults to mainnet>,
 *   nextAmount: <expected amount for next airdrop phase>
 * }
 */
app.get("/address/:rawAddress", async (request, response, next) => {
  const { rawAddress } = request.params;
  if (!rawAddress) {
    response.status(400).json({ error: "missing address" });
    return;
  }

  // verify address
  let checksummedAddress: string;
  try {
    checksummedAddress = ethers.utils.getAddress(rawAddress);
  } catch (e) {
    response.status(400).json({ error: "invalid address" });
    return;
  }

  // default values when no info in database
  // 4 for Rinkeby, 1 for mainnet, 31337 for hardhat test
  let chainId = 1;
  let nextAmount = BigNumber.from(0);

  try {
    const doc = await AddressInfo.findOne({ address: checksummedAddress });
    if (doc) {
      console.log(
        `Found entry: ${doc.address}, ${doc.chainId}, ${doc.nextAmount}`
      );
      chainId = doc.chainId || chainId;
      nextAmount = doc.nextAmount ? BigNumber.from(doc.nextAmount) : nextAmount;
    } else {
      console.log(`No doc found for address ${checksummedAddress}`);
    }
    response.json({
      chainId,
      nextAmount,
    });
  } catch (e) {
    console.log(`Failed to retrieve address info`);
    response.status(500).json({ error: "Failed to query database" });
  }
});

/**
 * Set the payout chainId for an address.
 *
 * Expected payload in body:
 * {
 *   "chainId": 123,
 *   "signature": "signature string"
 * }
 */
app.post("/address/:rawAddress", async (request, response, next) => {
  const { rawAddress } = request.params;
  const { chainId, signature } = request.body;

  // verify address
  if (!rawAddress) {
    response.status(400).json({ error: "missing address" });
    return;
  }
  let checksummedAddress: string;
  try {
    checksummedAddress = ethers.utils.getAddress(rawAddress);
  } catch (e) {
    response.status(400).json({ error: "invalid address" });
    return;
  }

  // verify chainId
  if (!chainId) {
    response.status(400).json({ error: "missing chainId" });
    return;
  }
  if (typeof chainId !== "number") {
    response.status(400).json({ error: "invalid chainId" });
    return;
  }

  // verify signature
  if (!signature) {
    response.status(400).json({ error: "missing signature" });
    return;
  }
  if (typeof signature !== "string") {
    response.status(400).json({ error: "invalid signature" });
    return;
  }
  const signedMessage = `Set chainId for ${checksummedAddress} to ${chainId}`;
  let signerAddress: string;
  try {
    signerAddress = verifyMessage(signedMessage, signature);
  } catch (e) {
    response.status(400).json({ error: "signature not matching" });
    return;
  }
  if (signerAddress !== checksummedAddress) {
    response.status(400).json({ error: "signature not matching" });
    return;
  }

  // store new chainId
  try {
    const res = await AddressInfo.updateOne(
      { address: checksummedAddress },
      { chainId: chainId },
      { upsert: true }
    );
    res.n; // Number of documents matched
    res.nModified; // Number of documents modified
    console.log(`Found ${res.n} entries, updated ${res.nModified} entries.`);
    response.json({ success: true });
  } catch (err) {
    console.log(`failed to set chainId: ${err.message}`);
    response.status(500).json({ error: "Failed to update database" });
  }
});

// APR Router

app.use("/apr", aprRouter);

app.get("/", (req, res) => res.send("Fairdrop backend server!"));

export default app;
