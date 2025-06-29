import { mockOrder } from './mock-data';
import { createPackingSlipPdfs } from './packing-slip-generator';

const pdf = (await createPackingSlipPdfs([mockOrder], true)).pdfs[0];
await Bun.write(`${import.meta.dirname}/test.pdf`, pdf);
