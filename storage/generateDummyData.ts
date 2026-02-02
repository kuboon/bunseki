// generateDummyData.ts
// ダミーデータ生成スクリプト
import { incrementCounter, initStorage, storeError, storeSpan } from "./mod.ts";
import type { SpanType } from "../otlp/schemas.ts";

const SERVICE_NAME = "o.kbn.one";

async function main() {
  await initStorage();

  // ページビューのダミーデータ
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const timestamp = date.getTime();
    await incrementCounter(
      SERVICE_NAME,
      "page_views",
      `/dummy/path/${i}`,
      timestamp,
      Math.floor(Math.random() * 100) + 1,
    );
  }

  // Spanのダミーデータ
  for (let i = 0; i < 5; i++) {
    const span: SpanType = {
      spanId: `span-${i}`,
      traceId: `trace-${i}`,
      startTimeUnixNano: `${Date.now() * 1_000_000}`,
      // ...他の必要なフィールドを追加
    } as SpanType;
    await storeSpan(SERVICE_NAME, span);
  }

  // Errorのダミーデータ
  for (let i = 0; i < 3; i++) {
    const span: SpanType = {
      spanId: `errspan-${i}`,
      traceId: `errtrace-${i}`,
      startTimeUnixNano: `${Date.now() * 1_000_000}`,
    } as SpanType;
    await storeError(SERVICE_NAME, span, {
      type: "Error",
      message: `Dummy error message ${i}`,
      stacktrace: ["dummyStack1", "dummyStack2"],
    });
  }

  console.log("Dummy data inserted.");
}

if (import.meta.main) {
  main();
}
