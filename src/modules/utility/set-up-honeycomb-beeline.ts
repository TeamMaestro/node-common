import { BeelineOpts } from '@teamhive/honeycomb-beeline';
import beeline = require('@teamhive/honeycomb-beeline');
import deterministicSamplerFactory = require('@teamhive/honeycomb-beeline/lib/deterministic_sampler')

function sampleHookFactory(ignoredRoutes: string[]) {
    return (data: any) => {
        // default sample rate to 10
        let sampleRate = 10;
    
        const deterministicSampler = deterministicSamplerFactory(sampleRate);

        let shouldSample = deterministicSampler(data);

        // drop ignoredRoutes
        if (ignoredRoutes.includes(data["request.path"])) {
            shouldSample = false;
            sampleRate = 0;
        }
        return {
            shouldSample,
            sampleRate
        }
    }
}


export function setUpHoneycombBeeline(opts: BeelineOpts & {
    appendEnvToDataset: boolean;
    /**
     * When no custom sampler hook is provided, these routes will be ignored
     * defaults to /api/v1/versions
     */
    ignoredRoutes?: string[]
}) {
    const {ignoredRoutes = ['/api/v1/versions']} = opts;
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
    if (!opts.samplerHook) {
        opts.samplerHook = sampleHookFactory(ignoredRoutes)
    }
    beeline(opts);
}