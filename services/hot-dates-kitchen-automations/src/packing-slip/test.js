import { mockOrder } from '../../tests/mock-data/order';
import { createPackingSlipPdfs } from './packing-slip-generator';

const pdf = (await createPackingSlipPdfs([mockOrder], true)).pdfs[0];
await Bun.write(`${import.meta.dirname}/test.pdf`, pdf);
