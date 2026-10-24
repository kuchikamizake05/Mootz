import { z } from './zod-reexport.mjs';

console.log(z.array(z.string()).safeParse(['fixture']));
