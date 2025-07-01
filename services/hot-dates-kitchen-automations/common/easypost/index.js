// EasyPost API client

//class AuthorizationError extends Error {
//    constructor(message) {
//        super(message)
//        this.name = 'AuthorizationError'
//    }
//}

export class EasyPostClient {
    headers = new Headers()
    constructor() {
		this.apiKey = Bun.env.EASYPOST_API_KEY
		this.baseUrl = Bun.env.EASYPOST_API_BASE_URL
        this.headers.append('Content-Type', 'application/json')
        this.headers.append('Authorization', `Basic ${btoa(`${this.apiKey}:`)}`)
    }

    // Create a shipment
    createShipment = async function (
        shipment,
    ) {
        const res = await fetch(`${this.baseUrl}/shipments`, {
            method: 'POST', 
            headers: this.headers,
            body: JSON.stringify({
                shipment,
            }),
        })
        return await res.json()
    }
    
    // Buy a shipment
    buyShipment = async function (
        shipmentId,
        rateId,
    ) {
        const res = await fetch(`${this.baseUrl}/shipments/${shipmentId}/buy`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify({
                rate: {
                    id: rateId,
                }
            }),
        })
        return await res.json()
    }
}
