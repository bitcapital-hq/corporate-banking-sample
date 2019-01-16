import * as path from "path";

export default {
    options: {
        file: {
            level: ['info', 'error'],
            filename: path.join(process.cwd(), "./logs/app.log"),
            handleExceptions: true,
            json: true,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            colorize: false,
        },
        console: {
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true,
        },
    } 
};