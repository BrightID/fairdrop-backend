import { Wallet } from 'ethers'
import request from 'supertest'
import app from "../app"


describe('Setting chainId', () => {

  it('should set xDai chainId', async ()=> {
    const wallet = Wallet.createRandom()
    const address = await wallet.getAddress()
    const chainId = 100 //xDai
    const message = `Set chainId for ${address} to ${chainId}`

    // get current payout chainID. Should be 1 for default mainnet
    const initialResponse = await request(app)
      .get(`/address/${address}`)
      .expect(200)
      .expect('Content-Type', /json/)
    expect(initialResponse.body).toHaveProperty('chainId', 1)

    // sign message with first address
    const signature = await wallet.signMessage(message)
    const postBody = {
      chainId,
      signature
    }
    const res = await request(app)
      .post(`/address/${address}`)
      .send(postBody)
      .expect(200)
    expect(res.body).toHaveProperty('success', true)

    // check if update really took place
    const finalResponse = await request(app)
      .get(`/address/${address}`)
      .expect(200)
      .expect('Content-Type', /json/)
    expect(finalResponse.body).toHaveProperty('chainId', chainId)
  })

  it('should fail when signing wrong message', async() => {
    const wallet = Wallet.createRandom()
    const address = await wallet.getAddress()
    const chainId = 100 //xDai
    const message = `This is a wrong message`

    // get current payout chainID. Should be 1 for default mainnet
    const initialResponse = await request(app)
      .get(`/address/${address}`)
      .expect(200)
      .expect('Content-Type', /json/)
    expect(initialResponse.body).toHaveProperty('chainId', 1)

    // sign message with first address
    const signature = await wallet.signMessage(message)
    const postBody = {
      chainId,
      signature
    }
    const res = await request(app)
      .post(`/address/${address}`)
      .send(postBody)
      .expect(400)
    expect(res.body).toHaveProperty('error', 'signature not matching')

    // check if chainId is unchanged
    const finalResponse = await request(app)
      .get(`/address/${address}`)
      .expect(200)
      .expect('Content-Type', /json/)
    expect(initialResponse.body).toHaveProperty('chainId', 1)
  })

  test('should fail when trying to change other address', async() => {
    // test a valid signature posted to wrong endpoint
    const wallet = Wallet.createRandom()
    const address = await wallet.getAddress()
    const chainId = 100 //xDai
    const message = `Set chainId for ${address} to ${chainId}`
    const victimAddress = '0xc44E4c49Ffa5Db98CA52770dff3e371ECB01f2D9'

    // get current payout chainID. Should be 1 for default mainnet
    const initialResponse = await request(app)
      .get(`/address/${victimAddress}`)
      .expect(200)
      .expect('Content-Type', /json/)
    expect(initialResponse.body).toHaveProperty('chainId', 1)

    // sign message with first address
    const signature = await wallet.signMessage(message)
    const postBody = {
      chainId,
      signature
    }
    const res = await request(app)
      .post(`/address/${victimAddress}`)
      .send(postBody)
      .expect(400)
    expect(res.body).toHaveProperty('error', 'signature not matching')

    // check if chainId is unchanged
    const finalResponse = await request(app)
      .get(`/address/${victimAddress}`)
      .expect(200)
      .expect('Content-Type', /json/)
    expect(initialResponse.body).toHaveProperty('chainId', 1)
  })
})
