import { listenPort } from "../local-dev.js";
import { createPool, migrate } from "./db.js";
import { startHttp } from "./http.js";
import { WorldService } from "./service.js";

const pool = createPool(process.env.DATABASE_URL, "mundo_dev");
await migrate(pool);
const service = WorldService.boot(pool);
await service.seed();
const http = await startHttp(service, listenPort());
console.log(JSON.stringify({ listening: http.url, runMode: service.config.runMode, interpreter: "fixture" }));
