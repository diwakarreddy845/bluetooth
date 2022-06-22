const {
    format,
    createLogger,
    transports
} = require('winston');
const {
    timestamp,
    combine,
    errors,
    json,
    printf
} = format;

 const logFormat = printf(({level,message,timestamp,stack }) => {
     return `${timestamp} : ${level}: ${stack || message}`;
 });

const logger = createLogger({
    format: combine(
        timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        errors({
            stack: true
        }),
        logFormat
    ),
    transports: [
        new transports.File({
            filename: 'combined.log'
        })
    ]
});
module.exports = logger;