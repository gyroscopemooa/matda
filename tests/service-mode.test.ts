import test from "node:test";
import assert from "node:assert/strict";
import { act, snapshot } from "../src/lib/domain";
import { matchesService, onlineRegion } from "../src/lib/service-mode";
import { categories } from "../src/lib/config";
import type { Database, User, Row } from "../src/lib/types";
test("Request categories retain legacy posts; online requests do not need or leak a local region", () => {
  const user: User = {
    id: "a",
    name: "요청자",
    email: "a@test.local",
    role: "customer",
    region: "",
    password: "",
    createdAt: new Date().toISOString(),
  };
  const db: Database = { users: [user], sessions: [], rows: [] };
  const online = act(db, user, "post.create", {
    body: "쇼핑몰 웹사이트 제작을 맡겨요",
    category: "제작·디지털",
    serviceMode: "online",
    region: "울산 남구 야음동",
  }) as Row;
  assert.equal(online.region, onlineRegion);
  assert.equal(online.serviceMode, "online");
  assert.ok(matchesService(online, "online", "서울특별시"));
  assert.ok(matchesService(online, "all", "전체 지역"));
  assert.ok(!matchesService(online, "local", "전체 지역"));
  assert.ok(!matchesService(online, "all", "서울특별시"));
  assert.throws(
    () =>
      act(db, user, "post.update", {
        id: online.id,
        body: "지역으로 변경",
        category: "제작·디지털",
        serviceMode: "local",
        region: "",
      }),
    /지역/,
  );
  const local = act(db, user, "post.create", {
    body: "청소를 맡겨요",
    category: "청소",
    region: "울산",
  }) as Row;
  assert.equal(local.category, "청소·관리");
  local.category = "인테리어·시공";
  assert.equal(
    snapshot(db, user).rows.find((r) => r.id === local.id)?.category,
    "공간·시공",
  );
  assert.ok(!matchesService(local, "online", "전체 지역"));
  assert.throws(
    () =>
      act(db, user, "post.create", {
        body: "불법 조합",
        category: "제작·디지털",
        serviceMode: "unknown",
      }),
    /서비스 방식/,
  );
  assert.equal(categories.length, 7);
});
