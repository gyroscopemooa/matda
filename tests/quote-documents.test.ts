import test from "node:test";
import assert from "node:assert/strict";
import { quoteDocument } from "../src/lib/quote-documents";
test("Quote documents validate format, size and download names", () => {
  const bytes = Buffer.from("%PDF-1.4\nfixture");
  const parsed = quoteDocument(
    { name: "../견적서.pdf", size: bytes.length },
    bytes,
  );
  assert.equal(parsed.mime, "application/pdf");
  assert.ok(!parsed.name.includes("/"));
  assert.throws(
    () => quoteDocument({ name: "견적.pdf", size: 1 }, Buffer.from("<script>")),
    /올바른/,
  );
  assert.throws(
    () => quoteDocument({ name: "견적.pdf", size: 0 }, bytes),
    /10MB/,
  );
  assert.throws(
    () =>
      quoteDocument({ name: "견적.pdf", size: 10 * 1024 * 1024 + 1 }, bytes),
    /10MB/,
  );
  assert.throws(
    () => quoteDocument({ name: "실행.exe", size: bytes.length }, bytes),
    /올바른/,
  );
});
