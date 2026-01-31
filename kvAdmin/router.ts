import { Hono } from "@hono/hono";

// Deno KV API
const kv = await Deno.openKv();

// 再帰的に全てのキー名を取得する関数
async function getAllKeys(prefix: Deno.KvKey = []): Promise<Deno.KvKey[]> {
  console.log("Getting keys with prefix:", prefix);
  const keys: Deno.KvKey[] = [];
  let count = 0;
  for await (const entry of kv.list({ prefix })) {
    keys.push(entry.key);
    count++;
    if (count >= 50) break;
  }
  return keys;
}

const kvAdmin = new Hono();

kvAdmin.get("/kv/keys", async (c) => {
  const keys = await getAllKeys();
  // キーを文字列で返す
  return c.json(keys.map((k) => k.join("/")));
});

export default kvAdmin;
