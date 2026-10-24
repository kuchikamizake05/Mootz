const zodModule = await import('./zod-reexport.mjs');

console.log(zodModule.z.array(zodModule.z.string()).safeParse(['fixture']));
