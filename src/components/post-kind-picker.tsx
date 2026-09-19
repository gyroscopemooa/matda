"use client";
import { useState } from "react";
import {
  postTypes,
  categories,
  businessCategories,
  normalizeCategory,
  categoryExamples,
} from "@/lib/config";
export default function PostKindPicker({
  value = "해줘요",
  category = "",
  biz = false,
  sector = "personal",
}: {
  value?: string;
  category?: string;
  biz?: boolean;
  sector?: string;
}) {
  const [communitySector, setSector] = useState(sector);
  const choices = biz
    ? businessCategories
    : communitySector === "business"
      ? [...categories, ...businessCategories]
      : categories;
  const [kind, setKind] = useState(value);
  const [selectedCategory, setSelectedCategory] = useState(
    normalizeCategory(category),
  );
  return (
    <>
      {!biz && (
        <label className="field">
          이야기 영역
          <select
            name="communitySector"
            value={communitySector}
            onChange={(e) => {
              setSector(e.target.value);
              setSelectedCategory("");
              if (kind === "업체 소개") setKind("해줘요");
            }}
          >
            <option value="personal">생활·개인</option>
            <option value="business">사업자·업체</option>
          </select>
        </label>
      )}
      <label className="field">
        글 종류
        <select
          name="type"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {[
            ...Object.values(postTypes),
            ...(communitySector === "business" ? ["업체 소개"] : []),
          ].map((t) => (
            <option key={t} value={t}>
              {communitySector === "business" && t === "해줘요"
                ? "업체 구함"
                : t}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        {kind === "해줘요" ? "카테고리 *" : "카테고리 (선택)"}
        <select
          name="category"
          required={kind === "해줘요"}
          value={selectedCategory}
          onChange={(event) => setSelectedCategory(event.target.value)}
        >
          <option value="">
            {kind === "해줘요" ? "분야 선택" : "분야 선택 안 함"}
          </option>
          {choices.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {!biz && categoryExamples[selectedCategory] && (
          <small className="muted">{categoryExamples[selectedCategory]}</small>
        )}
      </label>
      {kind === "업체 소개" && (
        <p className="muted">
          회사명·업무 범위·서비스 지역을 본문에 적어주세요. 업체 소개 탭에
          노출되며 인증을 뜻하지 않습니다.
        </p>
      )}
    </>
  );
}
