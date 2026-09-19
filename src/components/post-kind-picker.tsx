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
}: {
  value?: string;
  category?: string;
  biz?: boolean;
}) {
  const [kind, setKind] = useState(value);
  const [selectedCategory, setSelectedCategory] = useState(
    normalizeCategory(category),
  );
  return (
    <>
      <label className="field">
        글 종류
        <select
          name="type"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          {Object.values(postTypes).map((t) => (
            <option key={t}>{t}</option>
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
          {(biz ? businessCategories : categories).map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        {!biz && categoryExamples[selectedCategory] && (
          <small className="muted">{categoryExamples[selectedCategory]}</small>
        )}
      </label>
    </>
  );
}
