import { z } from '../../../node_modules/@reown/appkit-wallet/node_modules/zod/lib/index.mjs';

console.log(z.array(z.string()).safeParse(['fixture']));
