# fairdrop-backend

## Database
Backend expects a mongodb. Connection parameters are read from /config.js

## Endpoints
### RegistrationInfo
Returns timestamps for registration and claim phases
> GET /registrationInfo

### Address
#### Get info about an address:
- What is preferred chainId for payouts
- What amount is expected to be available in the **next** claimperiod
> `GET /address/<address>`

#### Change preferred chainId:
Requires a signed message to proof ownershop of address.
> `POST /address/<address>`

Expected post payload:
```json
{
  "chainId": 123,
  "signature": "signature string"
}
```

## Utility scripts

/scripts folder contains two scripts:

#### setRegistrationInfo.ts

Use this to set the timestamps for
- end of current registration
- start of next claim phase
- start of next registration phase

#### setNextAmount.ts

Use this to set the expected amount claimable for an an address in the *next* claim period.

To run the scripts use `ts-node`. 

Example:
`ts-node scripts/setNextAmount.ts 0xc44E4c49Ffa5Db98CA52770dff3e371ECB01f2D9 16000000000000000000`
