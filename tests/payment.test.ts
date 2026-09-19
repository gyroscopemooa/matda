import test from "node:test";
import assert from "node:assert/strict";
import {
  shadowLedger,
  refundLedger,
  reconcile,
  MockPaymentProvider,
  MockPayoutProvider,
} from "../src/lib/payments";
import { flags } from "../src/lib/config";
test("Phase 8: payment disabled, integer ledger, configurable tax, refund idempotency and reconciliation", async () => {
  assert.equal(flags.payments, false);
  const ledger = shadowLedger({
    orderRef: "order-1",
    gross: 100000,
    paymentFee: 1500,
    platformFee: 500,
    withholding: 0,
  });
  assert.equal(ledger.sellerNet, 98000);
  const refunded = refundLedger(ledger, 10000, "refund-1");
  assert.equal(refunded.sellerNet, 88000);
  assert.deepEqual(refundLedger(refunded, 10000, "refund-1"), refunded);
  assert.throws(() => refundLedger(refunded, 999999, "refund-2"), /초과/);
  assert.throws(() => shadowLedger({ orderRef: "x", gross: 1.1 }), /정수/);
  assert.equal(reconcile(refunded, 100000, 10000).matched, true);
  assert.equal(reconcile(refunded, 100000, 0).matched, false);
  assert.equal(
    (await new MockPaymentProvider().createPayment("order-1", 100000)).status,
    "mock",
  );
  assert.equal(
    (await new MockPayoutProvider().createPayout("seller", 88000, "pay-1"))
      .status,
    "mock",
  );
});
