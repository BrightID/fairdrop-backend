import { providers, Contract } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { formatUnits } from "ethers/lib/utils"
import V2LP_CONTRACT_ABI from "./abis/v2_lp.json";
import ERC20_CONTRACT_ABI from "./abis/erc20.json";
import BigNumber from "bignumber.js";
import { utils } from "ethers";
import { ERC721NftsProvider } from "./erc721Nfts";
import { abi as UniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import { Pool } from "@uniswap/v3-sdk";

const ethUsdcPool = "0xb4e16d0168e52d35cacd2c6185b44281ec28c9dc";
const hnyXdaiLpAddress = "0x4505b262dc053998c10685dc5f9098af8ae5c8ad";
const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const brightAddress = "0x5dd57da40e6866c9fcc34f4b6ddc89f1ba740dfe";
const brightOnXDaiAddress = "0x83FF60E2f93F8eDD0637Ef669C69D5Fb4f64cA8E"
const brightPoolAddress = "0x615d40af2c321bd0cd6345ae0a7fc1506a659a89";
const ethStakingRewardsAddress = "0x79A7CAD3Ac4554C133dCaaa9Bc3319385Eb7FD5D";
const subsAddress = "0x61CEAc48136d6782DBD83c09f51E23514D12470a";
const xdaiStakingRewardsAddress = "0x79A7CAD3Ac4554C133dCaaa9Bc3319385Eb7FD5D";
const hnyBrightLpAddress = "0x0907239acfe1d0cfc7f960fc7651e946bb34a7b0";
const brightHardCap = new BigNumber("10000000000000000000000000");

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

export const getV3Liquidity = async (ethProvider: providers.Provider) => {
  try {
    const totalEth = await ERC721NftsProvider(ethProvider);
    const ethPrice = await getEthPrice(ethProvider);

    if (!totalEth || !ethPrice) {
      throw new Error("unable to query network");
    }

    const totalEthBn = new BigNumber(totalEth.toExact() || 0);
    const totalLiquidity = ethPrice.multipliedBy(totalEthBn);

    return totalLiquidity;
  } catch (err) {
    console.log("error getting eth liquidity", err);
    return new BigNumber("0");
  }
};

export const getSubsLiquidity = async (ethProvider: providers.Provider) => {
  try {
    const subsContract = new Contract(
      subsAddress,
      ERC20_CONTRACT_ABI,
      ethProvider
    );

    const subsBalance = await subsContract.balanceOf(ethStakingRewardsAddress);

    return subsBalance;
  } catch (err) {
    return new BigNumber("0");
  }
};

export const getXdaiLiquidity = async (xdaiProvider: providers.Provider) => {
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

    return totalLiquidityInUsd;
  } catch (err) {
    console.log("error getting xdai liquidity", err);
    return new BigNumber("0");
  }
};

// Bright token holders excluded from circulating supply - mainnet
const SubsFarmMainnet = "0x79a7cad3ac4554c133dcaaa9bc3319385eb7fd5d"
const M3SafeMainnet = "0x693fb04d603d800fa9456a02564ba060da8939fc"
// Bright token holders excluded from circulating supply - xDai
const BrightDAOCommunityPoolXDai = "0xfE5be80856c196ff6061aEb7cffbaFA305c027e2"
const M3SafeXDai = "0x81360A0a15710A64d0b921122660e287BeB7743F"

type BrightSupplyData = {
  brightSupply: BigNumber,
  brightMaxSupply: BigNumber,
  brightCirculatingSupply: BigNumber,
}
export const getBrightSupply = async (ethProvider: providers.Provider, xdaiProvider: providers.Provider): Promise<BrightSupplyData> => {
  try {
    // bright erc20 on mainnet
    const brightContract = new Contract(
      brightAddress,
      ERC20_CONTRACT_ABI,
      ethProvider
    );
    // get total supply
    const brightSupply = await brightContract.totalSupply();
    console.log(`bright supply: ${formatUnits(brightSupply)}`)

    // get locked balances on mainnet

    // TODO: stop subtracting the subsFarm after Sep 16th 2023 after all rewards are claimable 
    const subsFarmBalance = await brightContract.balanceOf(SubsFarmMainnet)
    console.log(`subsFarmBalance: ${formatUnits(subsFarmBalance)}`)
    const m3SafeMainnetBalance = await brightContract.balanceOf(M3SafeMainnet)
    console.log(`m3SafeMainnetBalance: ${formatUnits(m3SafeMainnetBalance)}`)

    // bright erc20 on xDai
    const brightXDaiContract = new Contract(
      brightOnXDaiAddress,
      ERC20_CONTRACT_ABI,
      xdaiProvider
    )
    // get locked balances on xDai
    const brightDAOCommunityPoolXDaiBalance = await brightXDaiContract.balanceOf(BrightDAOCommunityPoolXDai)
    console.log(`brightDAOCommunityPoolXDaiBalance: ${formatUnits(brightDAOCommunityPoolXDaiBalance)}`)
    const m3SafeXDaiBalance = await brightXDaiContract.balanceOf(M3SafeXDai)
    console.log(`m3SafeXDaiBalance: ${formatUnits(m3SafeXDaiBalance)}`)

    let circulating = brightSupply
      .sub(subsFarmBalance)
      .sub(m3SafeMainnetBalance)
      .sub(brightDAOCommunityPoolXDaiBalance)
      .sub(m3SafeXDaiBalance)
    console.log(`bright circulating supply: ${formatUnits(circulating)}`)

    // TODO only use one BigNumber type throughout the app to get rid of this conversion
    return {
      brightSupply: new BigNumber(
        utils.formatUnits(brightSupply, 0)
      ),
      brightMaxSupply: brightHardCap,
      brightCirculatingSupply: new BigNumber(
        utils.formatUnits(circulating, 0)
      )
    };
  } catch (err: any) {
    console.log("error getting Bright supply", err.message);
    return {
      brightSupply: new BigNumber("0"),
      brightMaxSupply: new BigNumber("0"),
      brightCirculatingSupply: new BigNumber("0"),
    };
  }
};
