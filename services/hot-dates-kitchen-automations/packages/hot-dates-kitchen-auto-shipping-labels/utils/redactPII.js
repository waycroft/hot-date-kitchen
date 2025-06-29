const REDACT_KEYS = [
  'shippingAddress',
  'billingAddress',
  'note',
  'noteAttributes',
  'creditCardBin',
  'creditCardNumber',
  'name',
  'expirationMonth',
  'expirationYear',
  'email',
  'firstName',
  'lastName',
  'email',
  'address1',
  'street1',
  'address2',
  'zip',
  'phone'
];

const redactKeySet = new Set(REDACT_KEYS.map(k => k.toLowerCase()));

const redactPII = (obj) => {
  if (Array.isArray(obj)) {
    return obj.map(redactPII);
  } else if (obj && typeof obj === 'object') {
    const out = {};
    for (let [k, v] of Object.entries(obj)) {
      const key = k.toLowerCase();
      if (redactKeySet.has(key)) {
        out[k] = '[REDACTED]';
      }
      // redacts all shopify custom properties
      else if (k === 'custom_attributes' && Array.isArray(v)) {
        out[k] = v.map(a => (
          {
            ...a,
            value: '[REDACTED]'
          }
        ));
      } else {
        out[k] = redactPII(v);
      }
    }
    return out;
  }
  return obj;
};

const containsPII = (obj) => {
  if (Array.isArray(obj)) {
    return obj.some(containsPII);
  } else if (obj && typeof obj === 'object') {
    for (const [key, val] of Object.entries(obj)) {
      if (
        (redactKeySet.has(key.toLowerCase()) ||
        // shopify custom properties
        (key === 'custom_attributes' && Array.isArray(val))) &&
        val != null &&
        val !== '' &&
        val !== '[REDACTED]'
      ) {
        return true;
      }
      if (containsPII(val)) {
        return true;
      }
    }
  }
  return false;
};

export {
  redactPII,
  containsPII,
}
