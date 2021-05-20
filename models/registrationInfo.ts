import {model, Schema} from "mongoose"

export interface IRegistrationInfo {
  currentRegistrationEnd: number,
  nextRegistrationStart: number,
  nextClaimStart: number,
}

const schema = new Schema<IRegistrationInfo>({
  currentRegistrationEnd: { type: Number, required: true},
  nextRegistrationStart: { type: Number, required: true},
  nextClaimStart: { type: Number, required: true},
})

const RegistrationInfo = model<IRegistrationInfo>('registrationInfo', schema)

export default RegistrationInfo
