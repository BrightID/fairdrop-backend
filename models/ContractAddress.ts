import {model, Schema } from "mongoose"

export interface IContractAddress {
  name: string,
  chainId: number,
  address: string,
}

const schema = new Schema<IContractAddress>({
  name: { type: String, required: true},
  chainId: { type: Number, required: true},
  address: {type: String, required: false},
})

const ContractAddress = model<IContractAddress>('contractAddress', schema)

export default ContractAddress
