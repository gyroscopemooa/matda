"use client";
import { useState } from "react";
import type { Row } from "@/lib/types";
import { proposalLabels, type ProposalType } from "@/lib/proposals";
export default function ProposalFields({ initial }: { initial?: Row }) {
  const [type, setType] = useState<ProposalType>(
    (initial?.proposalType as ProposalType) || "fixed",
  );
  const field = (
    name: string,
    label: string,
    required = false,
    inputType = "text",
  ) => (
    <label className="field" key={name}>
      {label}
      {required && " *"}
      <input
        name={name}
        type={inputType}
        min={inputType === "number" ? 0 : undefined}
        required={required}
        defaultValue={String(initial?.[name] ?? "")}
      />
    </label>
  );
  return (
    <>
      <label className="field">
        제안 유형
        <select
          name="proposalType"
          value={type}
          onChange={(e) => setType(e.target.value as ProposalType)}
        >
          {Object.entries(proposalLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {type !== "inspection" &&
        field(
          "amount",
          type === "estimate" ? "최소 예상 금액 (원)" : "견적 금액 (원)",
          true,
          "number",
        )}
      {type === "estimate" && (
        <>
          {field("amountMax", "최대 예상 금액 (원)", true, "number")}
          {field("priceCondition", "가격 변동 조건", true)}
        </>
      )}
      {type === "inspection" && (
        <>
          {field("inspectionReason", "확인할 사항 · 사진/현장 확인 이유", true)}
          {field("visitSlots", "상담·방문 가능 일정", true)}
          {field("visitFee", "상담·방문비 (원, 무료는 0)", true, "number")}
          <p className="muted">
            작업 금액은 미정으로 표시됩니다. 상담·방문비와 작업 금액은
            별개입니다.
          </p>
        </>
      )}
      {field("message", "한줄 설명", true)}
      {field("scope", "포함범위 (선택)")}
      {field("duration", "예상시간 (선택)")}
      {field("availableDate", "가능일 (선택)", false, "date")}
      {field("extraCost", "추가비용 조건 (선택)")}
      <p className="muted">
        세부 협의는 채팅으로 진행하고, 합의한 금액·범위를 확정 견적으로
        수정해주세요.
      </p>
    </>
  );
}
