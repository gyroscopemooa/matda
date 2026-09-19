import { test } from "node:test";
import assert from "node:assert/strict";
import {
  regions,
  matchesRegion,
  validRegion,
  splitRegion,
} from "../src/lib/regions";
test("Nationwide hierarchy and regional isolation", () => {
  assert.equal(Object.keys(regions).length, 17);
  assert.ok(regions["울산광역시"]["남구"].includes("야음동"));
  assert.ok(validRegion("울산 남구 야음동", true));
  assert.ok(!validRegion("울산 남구 역삼동", true));
  assert.ok(!validRegion("울산", true));
  assert.ok(validRegion("세종특별자치시 고운동", true));
  assert.ok(validRegion("경기도 성남시 분당구 정자동", true));
  assert.equal(splitRegion("서울 강남구").district, "강남구");
  assert.ok(matchesRegion("울산 남구 야음동", "울산광역시 남구"));
  assert.ok(!matchesRegion("부산 남구 대연동", "울산광역시 남구"));
  assert.ok(!matchesRegion("울산 남구 삼산동", "울산광역시 남구 야음동"));
  assert.ok(matchesRegion("서울 강남구", "서울특별시"));
});
