import { createHash } from 'crypto';
import { BeelineOpts } from 'honeycomb-beeline';
import beeline = require('honeycomb-beeline');
import deterministicSamplerFactory = require('honeycomb-beeline/lib/deterministic_sampler');
import { TELEMETRY_DO_NOT_SAMPLE_KEY } from '../consts';
import { TELEMETRY_DYNAMIC_SAMPLE_RATE_KEY } from '../consts/telemetry-dynamic-sample-rate-key.const';

// https://docs.honeycomb.io/getting-data-in/beeline/nodejs/
function traceSampler(traceId: string, sampleRate: number) {
    const MAX_UINT32 = Math.pow(2, 32) - 1;
    const sum = createHash('sha1').update(traceId).digest();
    const upperBound = (MAX_UINT32 / sampleRate) >>> 0;
    return {
        shouldSample: sum.readUInt32BE(0) <= upperBound,
        sampleRate
    };
}

function sampleHookFactory(options: { ignoredRoutes: string[]; sampleRate?: number; ignoredBaseUrls: string[] }) {
    const { ignoredBaseUrls = [], ignoredRoutes, sampleRate = 1 } = options;
    const deterministicSampler = deterministicSamplerFactory(sampleRate);
    return (data: any) => {
        let { shouldSample, sampleRate: usedSampleRate } = deterministicSampler(data);

        // check for manual ignore
        if (data[TELEMETRY_DO_NOT_SAMPLE_KEY] || data[`app.${TELEMETRY_DO_NOT_SAMPLE_KEY}`]) {
            shouldSample = false;
            usedSampleRate = 0;
        }

        const dynamicSampleRate =
            data[TELEMETRY_DYNAMIC_SAMPLE_RATE_KEY] ?? data[`app.${TELEMETRY_DYNAMIC_SAMPLE_RATE_KEY}`];
        if (dynamicSampleRate !== null && dynamicSampleRate !== undefined) {
            let sampleResult = traceSampler(data['trace.trace_id'], dynamicSampleRate);
            shouldSample = sampleResult.shouldSample;
            usedSampleRate = sampleResult.sampleRate;
        }

        // drop ignoredRoutes
        if (ignoredRoutes.includes(data['request.path'])) {
            shouldSample = false;
            usedSampleRate = 0;
        }
        if (ignoredBaseUrls.find((url) => data.url && typeof data.url === 'string' && data.url.startsWith(url))) {
            shouldSample = false;
            usedSampleRate = 0;
        }
        return {
            shouldSample,
            sampleRate: usedSampleRate
        };
    };
}

export function setUpHoneycombBeeline(
    opts: BeelineOpts & {
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
    }
) {
    const { ignoredRoutes = ['/api/v1/versions'], sampleRate, ignoredBaseUrls } = opts;
    if (!opts.writeKey) {
        const writeKey = process.env.HONEYCOMB_WRITEKEY;
        if (writeKey && writeKey.length > 0) {
            opts.writeKey = writeKey;
        } else {
            console.warn('No honeycomb writekey provided');
            if (opts.transmission === undefined || opts.transmission === null) {
                opts.disabled = true as any;
                console.warn('Honeycomb transmission disabled.');
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
        });
    }
    beeline(opts);
}
