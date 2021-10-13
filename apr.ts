import { ethers, Contract, utils } from "ethers";
import ERC20_CONTRACT_ABI from "./abis/erc20.json";
import V2LP_CONTRACT_ABI from "./abis/v2_lp.json";
import BigNumber from "bignumber.js";
import { ERC721NftsProvider } from "./erc721Nfts";
import { getEthPrice, getHnyPrice, getBrightPrice } from "./prices";
import express from "express";

export const aprRouter = express.Router();

// brightFarm
const myInfuraURL =
  "https://mainnet.infura.io/v3/dee17e93aa98407f810c8b48d9e16764";

// testing
// const myInfuraURL =
//   "https://mainnet.infura.io/v3/7cbdeae58bbd4646a7f896315326f244";

// Constants

const ethStakingRewardsAddress = "0x79A7CAD3Ac4554C133dCaaa9Bc3319385Eb7FD5D";
const subsAddress = "0x61CEAc48136d6782DBD83c09f51E23514D12470a";
const xdaiStakingRewardsAddress = "0x79A7CAD3Ac4554C133dCaaa9Bc3319385Eb7FD5D";
const hnyBrightLpAddress = "0x0907239acfe1d0cfc7f960fc7651e946bb34a7b0";

// providers
let ethProvider: ethers.providers.Provider;
let xdaiProvider: ethers.providers.Provider;

try {
  // ETH
  ethProvider = new ethers.providers.JsonRpcProvider(myInfuraURL);
  // XDAI
  xdaiProvider = ethers.getDefaultProvider("https://rpc.xdaichain.com/");

  getBrightPrice(ethProvider);
} catch (err: any) {
  console.log("unable to setup ethers");
  console.log(err.message);
}

aprRouter.get("/ethLiquidity", async (request, response, next) => {
  try {
    const subsContract = new Contract(
      subsAddress,
      ERC20_CONTRACT_ABI,
      ethProvider
    );

    const subsBalance = await subsContract.balanceOf(ethStakingRewardsAddress);

    const totalEth = await ERC721NftsProvider(ethProvider);

    const ethPrice = await getEthPrice(ethProvider);
    const totalEthBn = new BigNumber(totalEth?.toExact() || 0);
    const totalLiquidity = ethPrice?.multipliedBy(totalEthBn);

    response.json({
      subsBalance: subsBalance.toString(),
      totalV3Liquidity: totalLiquidity?.toString(),
    });
  } catch (err) {
    response.status(500).json({ error: "Unable to query eth network" });
  }
});

aprRouter.get("/xdaiLiquidity", async (request, response, next) => {
  try {
    const hnyBrightLpContract = new Contract(
      hnyBrightLpAddress,
      V2LP_CONTRACT_ABI,
      xdaiProvider
    );
    // token0 0x71850b7E9Ee3f13Ab46d67167341E4bDc905Eef9 - HNY
    // token1 0x83FF60E2f93F8eDD0637Ef669C69D5Fb4f64cA8E - BRIGHT

    const hnyBrightReserves = await hnyBrightLpContract.getReserves();

    const hnyReserves = new BigNumber(hnyBrightReserves[0].toString());

    const totalBalanceStaked = new BigNumber(
      (
        await hnyBrightLpContract.balanceOf(xdaiStakingRewardsAddress)
      ).toString()
    );

    const totalSupply = new BigNumber(
      (await hnyBrightLpContract.totalSupply()).toString()
    );

    const ratioStakedLiquidity = totalBalanceStaked.dividedBy(totalSupply);

    const totalLiquidityInHny = hnyReserves
      .multipliedBy(2)
      .multipliedBy(ratioStakedLiquidity)
      .dividedBy(10 ** 18);

    const hnyPrice = await getHnyPrice(xdaiProvider);
    const totalLiquidityInUsd = totalLiquidityInHny.multipliedBy(hnyPrice);

    response.json({
      totalLiquidity: totalLiquidityInUsd.toString(),
    });
  } catch (err) {
    response.status(500).json({ error: "Unable to query xdai network" });
  }
});

aprRouter.get("/brightPrice", async (request, response, next) => {
  try {
    const brightPrice = await getBrightPrice(ethProvider);
    if (brightPrice.isZero()) {
      response.status(500).json({ error: "Unable to get eth price" });
    } else {
      response.json({ usd: brightPrice.toString() });
    }
  } catch {
    response.status(500).json({ error: "Unable to get eth price" });
  }
});

aprRouter.get("/ethPrice", async (request, response, next) => {
  try {
    const ethPrice = await getEthPrice(ethProvider);
    if (ethPrice.isZero()) {
      response.status(500).json({ error: "Unable to get eth price" });
    } else {
      response.json({ usd: ethPrice.toString() });
    }
  } catch {
    response.status(500).json({ error: "Unable to get eth price" });
  }
});

aprRouter.get("/hnyPrice", async (request, response, next) => {
  try {
    const hnyPrice = await getHnyPrice(xdaiProvider);
    if (hnyPrice.isZero()) {
      response.status(500).json({ error: "Unable to get hny price" });
    } else {
      response.json({ usd: hnyPrice.toString() });
    }
  } catch {
    response.status(500).json({ error: "Unable to get hny price" });
  }
});
