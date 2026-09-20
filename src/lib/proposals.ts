import { AppError, money, required, type Row } from "./types";
export const proposalLabels = {
  fixed: "확정 견적",
  estimate: "예상 견적",
  inspection: "확인 후 견적",
};
export type ProposalType = keyof typeof proposalLabels;
export function proposalTerms(input: Record<string, unknown>) {
  const proposalType = String(input.proposalType || "fixed") as ProposalType;
  if (!Object.hasOwn(proposalLabels, proposalType))
    throw new AppError("제안 유형을 확인해주세요.");
  const price = (key: string) => {
    if (input[key] === "" || input[key] == null)
      throw new AppError("금액을 입력해주세요.");
    return money(input[key]);
  };
  const amount = proposalType === "inspection" ? null : price("amount");
  const amountMax = proposalType === "estimate" ? price("amountMax") : null;
  if (amountMax !== null && amountMax < amount!)
    throw new AppError("최대 금액은 최소 금액 이상이어야 합니다.");
  return {
    proposalType,
    amount,
    amountMax,
    priceCondition:
      proposalType === "estimate"
        ? required(input.priceCondition, "가격 변동 조건", 1000)
        : "",
    inspectionReason:
      proposalType === "inspection"
        ? required(input.inspectionReason, "확인할 사항", 1000)
        : "",
    visitFee: proposalType === "inspection" ? price("visitFee") : null,
    visitSlots:
      proposalType === "inspection"
        ? required(input.visitSlots, "상담·방문 가능 일정", 500)
        : "",
  };
}
export function proposalPrice(q: Row) {
  if (q.proposalType === "inspection") return "가격 미정 · 확인 후 산정";
  const format = (v: unknown) => Number(v).toLocaleString("ko-KR") + "원";
  return q.proposalType === "estimate"
    ? `${format(q.amount)} ~ ${format(q.amountMax)}`
    : format(q.amount);
}
