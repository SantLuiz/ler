import path from 'node:path';
import {mkdirSync} from 'node:fs';

// Process-local paths only: no environment variable is persisted to the machine.
const data=path.resolve(import.meta.dir,'../.ler');
const temporary=path.join(data,'tmp');
mkdirSync(temporary,{recursive:true});
process.env.TEMP=temporary;
process.env.TMP=temporary;
process.env.TMPDIR=temporary;
process.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH=path.join(data,'cache','transpiler');
process.env.XDG_CACHE_HOME=path.join(data,'cache');
process.env.XDG_CONFIG_HOME=path.join(data,'config');
process.env.XDG_DATA_HOME=path.join(data,'runtime');
const {ensureSolidTransformPlugin}=await import('@opentui/solid/bun-plugin');
ensureSolidTransformPlugin();
