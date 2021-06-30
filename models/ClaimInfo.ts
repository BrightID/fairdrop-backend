import {model, Schema } from "mongoose"

/**
 * ClaimInfo is one leaf of a merkle tree with some additional info:
 *  - address
 *  - chainId
 *  - leaf of merkleTree (JSON stored as a string blob)
 */
export interface IClaimInfo {
  address: string,
  chainId: number,
  leaf: string,
}

const schema = new Schema<IClaimInfo>({
  address: { type: String, required: true, unique: true},
  chainId: { type: Number, required: true },
  leaf: {type: String, required: true}
})

const ClaimInfo = model<IClaimInfo>('claimInfo', schema)

export default ClaimInfo
