import { money, AppError } from "./types";
export type Ledger = {
  orderRef: string;
  gross: number;
  refund: number;
  paymentFee: number;
  platformFee: number;
  withholding: number;
  sellerNet: number;
  currency: "KRW";
  status: "shadow" | "refunded" | "reconciled";
  refundKeys: string[];
};
export interface PaymentProvider {
  createPayment(
    orderRef: string,
    amount: number,
  ): Promise<{ ref: string; status: "mock" }>;
  getPaymentStatus(ref: string): Promise<"mock">;
  refund(
    ref: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<{ ref: string; status: "mock" }>;
}
export interface PayoutProvider {
  createPayout(
    sellerId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<{ ref: string; status: "mock" }>;
  getPayoutStatus(ref: string): Promise<"mock">;
}
export class MockPaymentProvider implements PaymentProvider {
  async createPayment(orderRef: string, amount: number) {
    money(amount);
    return { ref: `mock:${orderRef}`, status: "mock" as const };
  }
  async getPaymentStatus() {
    return "mock" as const;
  }
  async refund(ref: string, amount: number, idempotencyKey: string) {
    money(amount);
    return { ref: `${ref}:refund:${idempotencyKey}`, status: "mock" as const };
  }
}
export class MockPayoutProvider implements PayoutProvider {
  async createPayout(sellerId: string, amount: number, idempotencyKey: string) {
    money(amount);
    return {
      ref: `mock:${sellerId}:${idempotencyKey}`,
      status: "mock" as const,
    };
  }
  async getPayoutStatus() {
    return "mock" as const;
  }
}
export function shadowLedger(input: {
  orderRef: string;
  gross: number;
  paymentFee?: number;
  platformFee?: number;
  withholding?: number;
}): Ledger {
  const gross = money(input.gross),
    paymentFee = money(input.paymentFee || 0),
    platformFee = money(input.platformFee || 0),
    withholding = money(input.withholding || 0);
  const sellerNet = gross - paymentFee - platformFee - withholding;
  if (sellerNet < 0)
    throw new AppError("차감액이 거래금액보다 클 수 없습니다.");
  return {
    orderRef: input.orderRef,
    gross,
    paymentFee,
    platformFee,
    withholding,
    sellerNet,
    refund: 0,
    currency: "KRW",
    status: "shadow",
    refundKeys: [],
  };
}
export function refundLedger(
  ledger: Ledger,
  amount: number,
  key: string,
): Ledger {
  if (!key) throw new AppError("멱등성 키가 필요합니다.");
  if (ledger.refundKeys.includes(key)) return ledger;
  money(amount);
  if (amount > ledger.sellerNet)
    throw new AppError(
      "환불 가능금액을 초과했습니다. 수수료 조정이 필요합니다.",
    );
  return {
    ...ledger,
    refund: ledger.refund + amount,
    sellerNet: ledger.sellerNet - amount,
    status: "refunded",
    refundKeys: [...ledger.refundKeys, key],
  };
}
export function reconcile(
  ledger: Ledger,
  providerGross: number,
  providerRefund: number,
) {
  return {
    matched:
      ledger.gross === money(providerGross) &&
      ledger.refund === money(providerRefund),
    difference: providerGross - providerRefund - (ledger.gross - ledger.refund),
  };
}
