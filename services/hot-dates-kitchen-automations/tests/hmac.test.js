import { test, expect } from 'bun:test';
import { validateShopifyWebhookHmac } from '../utils/webhook-validation';


test('validateShopifyWebhookHmac works when hmac is valid', () => {
	const secret = 'secret'
	const payload = 'payload'
	const payloadBuf = Buffer.from(payload)
	const givenHmac = new Bun.CryptoHasher('sha256', secret).update(payloadBuf).digest('base64')

	expect(validateShopifyWebhookHmac(givenHmac, payloadBuf, secret)).toBeTrue()
})

test('validateShopifyWebhookHmac works when hmac isnt valid', () => {
	const secret = 'secret'
	const givenPayloadBuf = Buffer.from('payload')
	const actualPayloadBuf = Buffer.from('paylobe')
	const givenHmac = new Bun.CryptoHasher('sha256', secret).update(givenPayloadBuf).digest('base64')

	expect(validateShopifyWebhookHmac(givenHmac, actualPayloadBuf, secret)).toBeFalse()
})
