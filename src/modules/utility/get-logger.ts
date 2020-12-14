import * as log from 'log4js';

export function getLogger(level: string = 'debug') {
    const logger = log.getLogger();
    logger.level = level;

    return logger;
}
