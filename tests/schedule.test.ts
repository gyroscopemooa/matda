import { test } from "node:test";
import assert from "node:assert/strict";
import { parseSchedule } from "../src/lib/schedule";
test("Optional schedule supports flexible, legacy date and validated ranges", () => {
  assert.equal(parseSchedule({}).scheduleMode, "flexible");
  assert.equal(
    parseSchedule({ desiredDate: "2026-10-02" }).scheduleMode,
    "date",
  );
  assert.equal(
    parseSchedule({
      scheduleMode: "range",
      desiredDate: "2026-10-02",
      desiredEndDate: "2026-10-05",
    }).desiredEndDate,
    "2026-10-05",
  );
  assert.equal(
    parseSchedule({
      scheduleMode: "flexible",
      desiredDate: "2026-10-02",
      desiredEndDate: "2026-10-05",
    }).desiredDate,
    "",
  );
  for (const dates of [
    { desiredDate: "2026-02-30" },
    { scheduleMode: "date" },
    {
      scheduleMode: "range",
      desiredDate: "2026-10-02",
      desiredEndDate: "2026-10-01",
    },
  ])
    assert.throws(() => parseSchedule(dates));
});
