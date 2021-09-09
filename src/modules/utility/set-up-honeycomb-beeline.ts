import { BeelineOpts } from '@teamhive/honeycomb-beeline';
import beeline = require('@teamhive/honeycomb-beeline');
import deterministicSamplerFactory = require('@teamhive/honeycomb-beeline/lib/deterministic_sampler')
import { TELEMETRY_DO_NOT_SAMPLE_KEY } from '../consts';

function sampleHookFactory(options: {
    ignoredRoutes: string[], 
    sampleRate?: number;
    ignoredBaseUrls: string[]
}) {
    const {ignoredBaseUrls = [], ignoredRoutes, sampleRate = 1} = options;
    const deterministicSampler = deterministicSamplerFactory(sampleRate);
    return (data: any) => {
        let { shouldSample } = deterministicSampler(data);
        let usedSampleRate = sampleRate;

        // check for manual ignore
        if (data[TELEMETRY_DO_NOT_SAMPLE_KEY]) {
            shouldSample = false;
            usedSampleRate = 0;
        }

        // drop ignoredRoutes
        if (ignoredRoutes.includes(data["request.path"])) {
            shouldSample = false;
            usedSampleRate = 0;
        }
        if (ignoredBaseUrls.find((url) => data.url && typeof data.url === 'string' && data.url.startsWith(url ))) {
            shouldSample = false;
            usedSampleRate = 0;
        }
        return {
            shouldSample,
            sampleRate: usedSampleRate
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
    /**
     * Ignores http requests sent to these urls
     */
    ignoredBaseUrls?: string[];
}) {
    const {ignoredRoutes = ['/api/v1/versions'], sampleRate, ignoredBaseUrls} = opts;
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
        opts.samplerHook = sampleHookFactory({
            ignoredRoutes,
            sampleRate,
            ignoredBaseUrls
        })
    }
    beeline(opts);
}