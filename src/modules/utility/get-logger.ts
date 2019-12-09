import * as log from 'log4js';
import { getConfig } from './get-config';

export function getLogger() {
    const level = getConfig('logger.level', 'debug');
    const logger = log.getLogger();
    logger.level = level;

    return logger;
}
