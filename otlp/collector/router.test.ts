import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect";

import { createCollectorRouter } from "./router.ts";
import { InMemoryStorage } from "./storage/memory.ts";

describe("collector /v1/logs", () => {
  it("prints received log records to stdout", async () => {
    const storage = new InMemoryStorage();
    const app = createCollectorRouter(storage);

    const stdoutLines: string[] = [];
    const originalLog = console.log;
    console.log = (...args: unknown[]) => {
      stdoutLines.push(args.map((arg) => String(arg)).join(" "));
    };

    try {
      const payload = {
        resourceLogs: [
          {
            resource: {
              attributes: [
                {
                  key: "service.name",
                  value: { stringValue: "test-service" },
                },
              ],
            },
            scopeLogs: [
              {
                scope: {
                  name: "test.scope",
                  version: "1.0.0",
                },
                logRecords: [
                  {
                    timeUnixNano: "1735689600000000000",
                    severityText: "INFO",
                    body: { stringValue: "hello" },
                  },
                ],
              },
            ],
          },
        ],
      };

      const res = await app.fetch(
        new Request("http://localhost/v1/logs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }),
      );

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({});
      expect(stdoutLines.length).toBe(1);

      const record = JSON.parse(stdoutLines[0]);
      expect(record.type).toBe("otlp.log");
      expect(record.serviceName).toBe("test-service");
      expect(record.severityText).toBe("INFO");
      expect(record.body).toEqual({ stringValue: "hello" });
    } finally {
      console.log = originalLog;
    }
  });
});
