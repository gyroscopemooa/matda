import test from "node:test";
import assert from "node:assert/strict";
import { refreshReminders } from "../src/lib/reminders";
import { validateEnvironment } from "../src/lib/env";
import { act, canRead } from "../src/lib/domain";
import type { Database, User, Row } from "../src/lib/types";
const user: User = {
  id: "a",
  name: "a",
  email: "a@test.local",
  password: "",
  role: "customer",
  region: "서울 강남구",
  createdAt: new Date().toISOString(),
};
test("Environment fail-closed, payments disabled and explicit local preview exception", () => {
  assert.equal(validateEnvironment({}).adapter, "local");
  assert.throws(
    () => validateEnvironment({ DATA_ADAPTER: "supabase" }),
    /DATA_ADAPTER=local/,
  );
  assert.throws(
    () => validateEnvironment({ PAYMENTS_ENABLED: "true" }),
    /결제/,
  );
  assert.throws(() => validateEnvironment({ NODE_ENV: "production" }), /차단/);
  assert.equal(
    validateEnvironment({ NODE_ENV: "production", ALLOW_LOCAL_PREVIEW: "true" })
      .adapter,
    "local",
  );
});
test("Organization members can read but cannot procure; role promotion scoped to owner", () => {
  const b = { ...user, id: "b", email: "b@test.local" },
    c = { ...user, id: "c", email: "c@test.local" };
  const db: Database = { users: [user, b, c], sessions: [], rows: [] };
  const org = act(db, user, "organization.create", { name: "org" }) as Row;
  act(db, user, "organization.addMember", {
    id: org.id,
    email: b.email,
    role: "member",
  });
  assert.equal(canRead(db, org, b), true);
  assert.throws(
    () =>
      act(db, b, "organization.addMember", {
        id: org.id,
        email: c.email,
        role: "admin",
      }),
    /권한/,
  );
  const input = {
    orgId: org.id,
    title: "RFQ",
    body: "scope",
    region: "서울 강남구",
    category: "전기·에너지",
    deadline: new Date(Date.now() + 86400000).toISOString(),
  };
  assert.throws(() => act(db, b, "rfq.create", input), /구매 담당/);
  act(db, user, "organization.addMember", {
    id: org.id,
    email: b.email,
    role: "procurement",
  });
  assert.equal((act(db, b, "rfq.create", input) as Row).kind, "rfq");
});
test("Reminders are idempotent per schedule and threshold; inspection/expiry independent", () => {
  const now = Date.now();
  const db: Database = {
    users: [user],
    sessions: [],
    rows: [
      {
        id: "contract",
        ownerId: user.id,
        kind: "contract",
        createdAt: new Date(now).toISOString(),
        updatedAt: new Date(now).toISOString(),
        name: "월간 계약",
        endAt: new Date(now + 6 * 86400000).toISOString(),
        inspectionAt: new Date(now + 86400000).toISOString(),
      },
    ],
  };
  refreshReminders(db, now);
  assert.equal(db.rows.filter((r) => r.kind === "notification").length, 2);
  refreshReminders(db, now);
  assert.equal(db.rows.filter((r) => r.kind === "notification").length, 2);
  refreshReminders(db, now + 5 * 86400000);
  assert.equal(db.rows.filter((r) => r.kind === "notification").length, 3);
});
