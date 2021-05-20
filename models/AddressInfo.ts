import {model, Schema, connect} from "mongoose"

export interface IAddressInfo {
  address: string,
  chainId: number,
  nextAmount: string, // string representation of BigNumber
}

const schema = new Schema<IAddressInfo>({
  address: { type: String, required: true}, // TODO: enforce uniqueness? Make this _id instead?
  chainId: { type: Number, required: true},
  nextAmount: {type: String, required: false},
})

const AddressInfo = model<IAddressInfo>('addressInfo', schema)

export default AddressInfo
