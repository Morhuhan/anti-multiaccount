"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sequelize = void 0;
const sequelize_1 = require("sequelize");
function getDatabaseConfig() {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
        const parsed = new URL(databaseUrl);
        return {
            host: parsed.hostname,
            port: parsed.port ? Number.parseInt(parsed.port, 10) : 3306,
            username: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password),
            database: parsed.pathname.replace(/^\//, ''),
        };
    }
    return {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number.parseInt(process.env.DB_PORT ?? '3306', 10),
        username: process.env.DB_USER ?? 'root',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME ?? 'anti_multiaccount',
    };
}
const config = getDatabaseConfig();
// A single Sequelize instance keeps connection pooling and model metadata in one place.
exports.sequelize = new sequelize_1.Sequelize(config.database, config.username, config.password, {
    host: config.host,
    port: config.port,
    dialect: 'mysql',
    logging: false,
    dialectModule: require('mysql2'),
    pool: {
        max: 10,
        min: 0,
        idle: 10_000,
        acquire: 30_000,
    },
});
//# sourceMappingURL=db.js.map