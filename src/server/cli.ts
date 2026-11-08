import { createPool, migrate } from "./db.js";
import { WorldService } from "./service.js";

const [command, arg] = process.argv.slice(2);
const pool = createPool(process.env.DATABASE_URL, "mundo_dev");
await migrate(pool);
const service = WorldService.boot(pool);
await service.seed();

if (command === "grant-admin" && arg) {
  await service.grantAdmin(arg);
  console.log("administrator role granted");
} else if (command === "mint-invite" && arg) {
  const minted = await service.mintInvite(arg);
  if (minted.status !== 201) {
    console.log("refused");
    process.exitCode = 1;
  } else {
    console.log(String(minted.body.code));
  }
} else {
  console.log("usage: grant-admin <author-id> | mint-invite <author-id>");
  process.exitCode = 1;
}
await pool.end();
