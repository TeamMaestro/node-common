import { BeelineOpts } from '@teamhive/honeycomb-beeline';
import beeline = require('@teamhive/honeycomb-beeline');
import deterministicSamplerFactory = require('@teamhive/honeycomb-beeline/lib/deterministic_sampler')

function sampleHookFactory(ignoredRoutes: string[], sampleRate: number = 1) {
    return (data: any) => {
    
        const deterministicSampler = deterministicSamplerFactory(sampleRate);

        let { shouldSample } = deterministicSampler(data);

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
    ignoredRoutes?: string[];
    disabled?: boolean;
}) {
    const {ignoredRoutes = ['/api/v1/versions']} = opts;
    if (!opts.writeKey) {
        const writeKey = process.env.HONEYCOMB_WRITEKEY;
        if (writeKey && writeKey.length > 0) {
            opts.writeKey = writeKey
        } else {
            console.warn('No honeycomb writekey provided')
            if (opts.transmission === undefined || opts.transmission === null) {
                opts.disabled = true
                console.warn('Honeycomb transmission disabled.')
            }
            
        }
    }
    if (opts.appendEnvToDataset) {
        const env = process.env.NODE_ENV ?? 'local';
        opts.dataset = `${opts.dataset}-${env}`;
    }
    if (!opts.serviceName) {
        opts.serviceName = process.env.APP;
    }
    if (!opts.samplerHook) {
        opts.samplerHook = sampleHookFactory(ignoredRoutes, opts.sampleRate)
    }
    beeline(opts);
}