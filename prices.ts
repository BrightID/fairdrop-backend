import { providers, Contract } from "ethers";
import { Token } from "@uniswap/sdk-core";
import V2LP_CONTRACT_ABI from "./abis/v2_lp.json";
import BigNumber from "bignumber.js";
import { utils } from "ethers";
import { abi as UniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import { Pool } from "@uniswap/v3-sdk";

const ethUsdcPool = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";
const hnyXdaiLpAddress = "0x4505b262dc053998c10685dc5f9098af8ae5c8ad";
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const brightAddress = "0x5dd57da40e6866c9fcc34f4b6ddc89f1ba740dfe";
const brightPoolAddress = "0x615d40af2c321bd0cd6345ae0a7fc1506a659a89";

export const getEthPrice = async (ethProvider: providers.Provider) => {
  try {
    const ethV2PoolContract = new Contract(
      ethUsdcPool,
      V2LP_CONTRACT_ABI,
      ethProvider
    );

    // token 0 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48 - USDC
    // token 1 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 - WETH
    const ethUSDCReserves = await ethV2PoolContract.getReserves();
    const usdcReserves = new BigNumber(
      utils.formatUnits(ethUSDCReserves[0], 6)
    );
    const ethReserves = new BigNumber(
      utils.formatUnits(ethUSDCReserves[1], 18)
    );
    const ethPrice = usdcReserves.dividedBy(ethReserves);

    return ethPrice;
  } catch (err: any) {
    console.log("error getting eth price", err.message);
    return new BigNumber("0");
  }
};

export const getHnyPrice = async (xdaiProvider: providers.Provider) => {
  try {
    // token0 0x71850b7E9Ee3f13Ab46d67167341E4bDc905Eef9 - HNY
    // token1 0xe91D153E0b41518A2Ce8Dd3D7944Fa863463a97d - WXDAI

    const hnyXdaiLpContract = new Contract(
      hnyXdaiLpAddress,
      V2LP_CONTRACT_ABI,
      xdaiProvider
    );

    const hnyXdaiReserves = await hnyXdaiLpContract.getReserves();
    const hnyReserves2 = new BigNumber(hnyXdaiReserves[0].toString());
    const xdaiReserves = new BigNumber(hnyXdaiReserves[1].toString());
    const hnyPrice = xdaiReserves.dividedBy(hnyReserves2);

    return hnyPrice;
  } catch (err: any) {
    console.log("error getting hny price", err.message);
    return new BigNumber("0");
  }
};

export const getBrightPrice = async (ethProvider: providers.Provider) => {
  try {
    const ethPrice = await getEthPrice(ethProvider);
    const brightV3PoolContract = new Contract(
      brightPoolAddress,
      UniswapV3PoolABI,
      ethProvider
    );

    const token0 = new Token(1, brightAddress, 18, "BRIGHT", "BRIGHT");
    const token1 = new Token(1, wethAddress, 18, "WETH", "WETH");

    const slot0 = await brightV3PoolContract.slot0();
    const liquidity = await brightV3PoolContract.liquidity();

    let pool = new Pool(
      token0,
      token1,
      3000,
      slot0.sqrtPriceX96,
      liquidity,
      slot0.tick
    );

    const brightPrice = pool.priceOf(token0);
    const numeratorBN = new BigNumber(brightPrice.numerator.toString());
    const denominatorBN = new BigNumber(brightPrice.denominator.toString());
    const price = numeratorBN.dividedBy(denominatorBN).multipliedBy(ethPrice);

    return price;
  } catch (err: any) {
    console.log("error getting bright price", err.message);
    return new BigNumber("0");
  }
};
