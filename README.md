# fairdrop-backend

## Database
Backend expects a mongodb. Connection parameters are read from /config.js
### unique constraint
There should never be multiple claims for one address. This can be enforced
on database level by creating a unique index on the address field. Execute
the following command in the mongo shell:

`db.claiminfos.createIndex({"address": 1}, {unique: true})`

## Endpoints
### RegistrationInfo
Returns timestamps for registration and claim phases
> GET /registrationInfo

### ClaimInfo
Returns the leaf of the merkletree for the provided address.
> `GET /claimInfo/<address>`

This returns a string that should be parsed into a JSON object.

Example:
```json
{"leaf":"{\"index\":0,\"address\":\"0x107D1198854fbbcB2E1014c3FFAb166b2595586a\",\"amount\":{\"type\":\"BigNumber\",\"hex\":\"0xe91a7cd19fa3b00000\"},\"proof\":[\"0x2f9f7c38292f1225434f3997a71bf792d09f6d8ddf8e7d999e1ed06a1131d7e1\",\"0xe7226ab75194ec5d59c88bea0b119eef9602cdba6751944076d3fcceb4fd8fd1\",\"0xd352978a87a93a8c60ae9b2fbb092dcdb709a8a83d4c9267347deeb1dc459d46\",\"0x0aaeacaad59bdd4028a97315da2815ceb9b6359abdd746555ad884134dd5a731\"]}"}

```
"leaf" contents parsed into JSON:
```json
{
    "index": 0,
    "address": "0x107D1198854fbbcB2E1014c3FFAb166b2595586a",
    "amount": {
      "type": "BigNumber",
      "hex": "0xe91a7cd19fa3b00000"
    },
    "proof": [
      "0x2f9f7c38292f1225434f3997a71bf792d09f6d8ddf8e7d999e1ed06a1131d7e1",
      "0xe7226ab75194ec5d59c88bea0b119eef9602cdba6751944076d3fcceb4fd8fd1",
      "0xd352978a87a93a8c60ae9b2fbb092dcdb709a8a83d4c9267347deeb1dc459d46",
      "0x0aaeacaad59bdd4028a97315da2815ceb9b6359abdd746555ad884134dd5a731"
    ]
}
```


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
