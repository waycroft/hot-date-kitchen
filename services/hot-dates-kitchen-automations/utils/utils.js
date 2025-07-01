/*
 * A Shopify guid looks something like this: gid://shopify/Order/6131724353707
 * Returns the "6131724353707".
 * @param {string} shopifyGuid - A shopify guid
 * @returns {number}
 */
export function extractNumberFromShopifyGuid(shopifyGuid) {
	const pattern = /gid:\/\/shopify\/(?:[A-Za-z])*\/(\d*)/
	const match = pattern.exec(shopifyGuid)
	if (match) {
		return match[1]
	}
	return null
}

/*
 * Remove " - Default Title" string from product line items that are the default variant.
 */
export function getDefaultVariantDisplayName(variantDisplayName) {
	const pattern = /(.*)(?: - Default Title)/
	const match = pattern.exec(variantDisplayName)
	if (match) {
		return match[1]
	}
	return null
}
