import { BeelineOpts } from '@teamhive/honeycomb-beeline';
import beeline = require('@teamhive/honeycomb-beeline');

export function setUpHoneycombBeeline(opts: BeelineOpts & {appendEnvToDataset: boolean}) {
    if (!opts.writeKey) {
        opts.writeKey = process.env.HONEYCOMB_WRITEKEY;
    }
    if (opts.appendEnvToDataset) {
        const env = process.env.NODE_ENV ?? 'local';
        opts.dataset = `${opts.dataset}-${env}`;
    }
    if (!opts.serviceName) {
        opts.serviceName = process.env.APP;
    }
    beeline(opts);
}