import { ethers } from "ethers";
import BigNumber from "bignumber.js";
import {
  getSubsLiquidity,
  getV3Liquidity,
  getXdaiLiquidity,
  // getEthPrice,
  // getHnyPrice,
  getBrightPrice,
  getBrightSupply,
} from "./prices"
import express from "express";

export const aprRouter = express.Router();

// brightFarm
const myInfuraURL =
  "https://mainnet.infura.io/v3/448d344e9a1c483a8ebdcc6c69833e19";

// providers
let ethProvider: ethers.providers.Provider;
let xdaiProvider: ethers.providers.Provider;

try {
  // ETH
  ethProvider = new ethers.providers.JsonRpcProvider(myInfuraURL);
  // XDAI
  xdaiProvider = new ethers.providers.JsonRpcProvider(
    "https://rpc.ankr.com/gnosis/51ac381249e27150efb048ea0540d297b5445eef551c8d79775cb12ba7f9f9ca"
    // "http://nethermind-xdai.dappnode:8545"
  );

  getBrightPrice(ethProvider);
} catch (err: any) {
  console.log("unable to setup ethers");
  console.log(err.message);
}

// CACHE variables

let subsBalance = new BigNumber("0");
let totalV3Liquidity = new BigNumber("0");
let xdaiLiquidity = new BigNumber("0");
let brightPrice = new BigNumber("0");
let brightSupply = new BigNumber("0");
let brightCirculatingSupply = new BigNumber("0");
let brightMaxSupply = new BigNumber("0");


const loop = async () => {
  try {
    subsBalance = await getSubsLiquidity(ethProvider);
    totalV3Liquidity = await getV3Liquidity(ethProvider);
    xdaiLiquidity = await getXdaiLiquidity(xdaiProvider);
    brightPrice = await getBrightPrice(ethProvider);
    ({brightSupply, brightCirculatingSupply, brightMaxSupply} = await getBrightSupply(ethProvider, xdaiProvider))
  } catch (err: any) {
    console.log(`unable to query prices: ${err.message}`);
  }
};

const INTERVAL_TIME = 180000; // 3 minutes

setInterval(() => {
  loop();
}, INTERVAL_TIME);

loop();

aprRouter.get("/ethLiquidity", async (request, response, next) => {
  try {
    if (subsBalance.isZero() && totalV3Liquidity.isZero) {
      throw new Error("Unable to query eth network");
    } else {
      response.json({
        subsBalance: subsBalance.toString(),
        totalV3Liquidity: totalV3Liquidity?.toString(),
      });
    }
  } catch (err) {
    response.status(500).json({ error: "Unable to query eth network" });
  }
});

aprRouter.get("/xdaiLiquidity", async (request, response, next) => {
  try {
    if (xdaiLiquidity.isZero()) {
      throw new Error("Unable to query xdai network");
    } else {
      response.json({ totalLiquidity: xdaiLiquidity.toString() });
    }
  } catch {
    response.status(500).json({ error: "Unable to query xdai network" });
  }
});

aprRouter.get("/brightPrice", async (request, response, next) => {
  try {
    if (brightPrice.isZero()) {
      throw new Error("Unable to query bright price");
    } else {
      response.json({ usd: brightPrice.toString() });
    }
  } catch {
    response.status(500).json({ error: "Unable to query bright price" });
  }
});

aprRouter.get("/brightSupply", async (request, response, next) => {
  try {
    if (brightSupply.isZero() || brightCirculatingSupply.isZero()) {
      throw new Error("Unable to query bright supply");
    } else {
      response.json({
        totalSupply: brightSupply.toFixed(),
        maxTotalSupply: brightMaxSupply.toFixed(),
        circulating: brightCirculatingSupply.toFixed(),
      });
    }
  } catch {
    response.status(500).json({ error: "Unable to query bright price" });
  }
});


// maybe add these later?

// aprRouter.get("/ethPrice", async (request, response, next) => {
//   try {
//     if (ethPrice.isZero()) {
//       response.status(500).json({ error: "Unable to get eth price" });
//     } else {
//       response.json({ usd: ethPrice.toString() });
//     }
//   } catch {
//     response.status(500).json({ error: "Unable to get eth price" });
//   }
// });

// aprRouter.get("/hnyPrice", async (request, response, next) => {
//   try {
//     if (hnyPrice.isZero()) {
//       response.status(500).json({ error: "Unable to get hny price" });
//     } else {
//       response.json({ usd: hnyPrice.toString() });
//     }
//   } catch {
//     response.status(500).json({ error: "Unable to get hny price" });
//   }
// });
