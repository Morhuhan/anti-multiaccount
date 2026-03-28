"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const promise_1 = __importDefault(require("mysql2/promise"));
function createPoolFromEnv() {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
        const parsed = new URL(databaseUrl);
        return promise_1.default.createPool({
            host: parsed.hostname,
            port: parsed.port ? Number.parseInt(parsed.port, 10) : 3306,
            user: decodeURIComponent(parsed.username),
            password: decodeURIComponent(parsed.password),
            database: parsed.pathname.replace(/^\//, ''),
            waitForConnections: true,
            connectionLimit: 10,
            namedPlaceholders: true,
        });
    }
    return promise_1.default.createPool({
        host: process.env.DB_HOST ?? 'localhost',
        port: Number.parseInt(process.env.DB_PORT ?? '3306', 10),
        user: process.env.DB_USER ?? 'root',
        password: process.env.DB_PASSWORD ?? '',
        database: process.env.DB_NAME ?? 'anti_multiaccount',
        waitForConnections: true,
        connectionLimit: 10,
        namedPlaceholders: true,
    });
}
exports.db = createPoolFromEnv();
//# sourceMappingURL=db.js.map