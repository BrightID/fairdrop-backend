import { Contract, providers } from "ethers";
import { Pool, Position } from "@uniswap/v3-sdk";
import { Token } from "@uniswap/sdk-core";
import { abi as NonfungiblePositionManagerABI } from "@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json";
import { abi as UniswapV3PoolABI } from "@uniswap/v3-core/artifacts/contracts/UniswapV3Pool.sol/UniswapV3Pool.json";
import UNISWAP_V3_STAKER_ABI from "./abis/uniswap_v3_staker.json";

import { BigNumber } from "ethers";

export type LiquidityPosition = {
  owner: string;
  staked: boolean;
  numberOfStakes: number;
  tokenId: BigNumber;
  uri: string;
  forTotalLiquidity: boolean;
  _position: Position | null;
};

const wethAddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
const brightAddress = "0x5dd57da40e6866c9fcc34f4b6ddc89f1ba740dfe";
const poolAddress = "0x615d40af2c321bd0cd6345ae0a7fc1506a659a89";
const uniswapV3StakerAddress = "0x1f98407aaB862CdDeF78Ed252D6f557aA5b0f00d";
const nftManagerPositionsAddress = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";

// helper
const checkForBrightLp = (token0: string, token1: string): boolean => {
  if (
    token0.toLowerCase() === wethAddress.toLowerCase() &&
    token1.toLowerCase() === brightAddress.toLowerCase()
  ) {
    return true;
  } else if (
    token0.toLowerCase() === brightAddress.toLowerCase() &&
    token1.toLowerCase() === wethAddress.toLowerCase()
  ) {
    return true;
  } else {
    return false;
  }
};

export const ERC721NftsProvider = async (ethProvider: providers.Provider) => {
  // check for WETH / BRIGHT Pair

  const brightV3PoolContract = new Contract(
    poolAddress,
    UniswapV3PoolABI,
    ethProvider
  );
  const nftManagerPositionsContract = new Contract(
    nftManagerPositionsAddress,
    NonfungiblePositionManagerABI,
    ethProvider
  );
  const uniswapV3StakerContract = new Contract(
    uniswapV3StakerAddress,
    UNISWAP_V3_STAKER_ABI,
    ethProvider
  );

  const loadPositions = async (owner: string) => {
    // get number of tokens owned by address
    try {
      const noOfPositions = await nftManagerPositionsContract.balanceOf(owner);

      // construct multicall to get all tokenIDs

      const tokenIdsCalldata: Array<string> = new Array(
        noOfPositions.toNumber()
      )
        .fill(0)
        .map((_, i) =>
          nftManagerPositionsContract.interface.encodeFunctionData(
            "tokenOfOwnerByIndex",
            [owner, i]
          )
        );

      // return list of tokenId big numbers
      const tokenIds = (
        await nftManagerPositionsContract.callStatic.multicall(tokenIdsCalldata)
      )
        .map((result: any) =>
          nftManagerPositionsContract.interface.decodeFunctionResult(
            "tokenOfOwnerByIndex",
            result
          )
        )
        .filter((tokenId: any) => Array.isArray(tokenId))
        .map(([tokenId]: any) => tokenId);

      // construst position call data
      const positionCallData = tokenIds.map((tokenId: any) =>
        nftManagerPositionsContract.interface.encodeFunctionData("positions", [
          tokenId,
        ])
      );

      const encodedPositions =
        await nftManagerPositionsContract.callStatic.multicall(
          positionCallData
        );

      // get pool info
      const slot0 = await brightV3PoolContract.slot0();

      // return Bright / Eth positions owned by user
      const positions: any[] = (
        await Promise.all(
          encodedPositions.map((encodedPosition: any, i: number) =>
            filterPositions(owner, encodedPosition, tokenIds[i], slot0)
          )
        )
      ).filter((p: any) => p);

      return positions;
    } catch (err) {
      console.log("err", err);
      return [];
    }
  };

  const filterPositions = async (
    owner: string,
    encodedPosition: any,
    tokenId: any,
    slot0: any
  ): Promise<any | null> => {
    try {
      const { token0, token1, liquidity, fee, tickLower, tickUpper } =
        nftManagerPositionsContract.interface.decodeFunctionResult(
          "positions",
          encodedPosition
        );

      // check for liquidity
      if (liquidity.isZero()) {
        return null;
      }

      // check for Bright / ETH pair
      if (!checkForBrightLp(token0, token1)) {
        return null;
      }

      // check if fee is 0.3%
      if (fee !== 3000) {
        return null;
      }

      // sdk position
      let _position: Position | null = null;
      if (
        poolAddress &&
        liquidity &&
        typeof tickLower === "number" &&
        typeof tickUpper === "number"
      ) {
        try {
          const _token0 = new Token(1, token0, 18, "BRIGHT", "BRIGHT");
          const _token1 = new Token(1, token1, 18, "WETH", "WETH");

          let pool = new Pool(
            _token0,
            _token1,
            fee,
            slot0.sqrtPriceX96,
            liquidity,
            slot0.tick
          );

          _position = new Position({
            pool,
            liquidity: liquidity.toString(),
            tickLower,
            tickUpper,
          });
        } catch (err) {
          console.log("error", err);
        }
      }

      const stakedPosition = await uniswapV3StakerContract.deposits(tokenId);

      return {
        owner,
        staked: !!stakedPosition.numberOfStakes,
        numberOfStakes: stakedPosition.numberOfStakes,
        tokenId,
        _position,
      };
    } catch {
      return null;
    }
  };

  const init = async () => {
    try {
      const owners: string[] = [uniswapV3StakerContract.address];

      const allPositions: LiquidityPosition[] = (
        await Promise.all(owners.map(loadPositions))
      ).flat();

      const totalETHValue = allPositions.flat().reduce((acc, { _position }) => {
        if (!_position) return acc;

        // BRIGHT is token0

        // bright Token
        let _brightToken = _position.pool.token0;

        // amount of bright in LP
        let brightAmount = _position.amount0;

        // amount of eth in LP
        let wethAmount = _position.amount1;

        // console.log("wethAmount", wethAmount.toFixed(2));

        // calc value of BRIGHT in terms of ETH
        const ethValueBright = _position.pool
          .priceOf(_brightToken)
          .quote(brightAmount);

        // console.log("brightAmount", brightAmount.toFixed(2));
        // console.log("ethValueBright", ethValueBright.toFixed(2));

        // add values of all tokens in ETH
        return acc?.add(ethValueBright).add(wethAmount);
      }, allPositions[0]._position?.amount1.multiply("0"));

      return totalETHValue;
    } catch (e) {}
  };

  return await init();

  // handle nft events
};
