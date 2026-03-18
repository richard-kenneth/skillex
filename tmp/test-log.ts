import pino from 'pino';

const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    singleLine: true,
    colorize: true,
    ignore: 'pid,hostname,context,req,res,responseTime',
    messageFormat: '{msg}',
  },
});

const logger = pino(transport);

logger.info('Hello world');
logger.info({ context: 'Test' }, 'Message with context');
logger.info({ data: 123 }, 'Message with data');
logger.info({ data: 123 }); // No message
logger.warn('This is a warning');
logger.debug('This is a debug log');
