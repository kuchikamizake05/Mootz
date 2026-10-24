import { z } from '../../../node_modules/@privy-io/api-base/node_modules/zod/index.js';

console.log(z.array(z.string()).safeParse(['fixture']));
