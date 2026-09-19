"use client";
import { useState } from "react";
import { regions, splitRegion } from "@/lib/regions";
export default function RegionPicker({
  name = "region",
  value = "",
  required = false,
}: {
  name?: string;
  value?: string;
  required?: boolean;
}) {
  const initial = splitRegion(value);
  const [province, setProvince] = useState(initial.province);
  const [district, setDistrict] = useState(initial.district);
  const [town, setTown] = useState(initial.town);
  const districts = regions[province] || {};
  const towns = districts[district] || [];
  return (
    <fieldset className="region-fields">
      <legend>지역{required ? " *" : ""}</legend>
      <div className="region-selects">
        <label>
          시/도
          <select
            aria-label="시/도"
            value={province}
            required={required}
            onChange={(e) => {
              setProvince(e.target.value);
              setDistrict("");
              setTown("");
            }}
          >
            <option value="">{required ? "시/도 선택" : "전체 지역"}</option>
            {Object.keys(regions).map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        {province && province !== "세종특별자치시" && (
          <label>
            시/군/구
            <select
              aria-label="시/군/구"
              value={district}
              disabled={!province || province === "세종특별자치시"}
              required={required && province !== "세종특별자치시"}
              onChange={(e) => {
                setDistrict(e.target.value);
                setTown("");
              }}
            >
              <option value="">
                {province === "세종특별자치시"
                  ? "해당 없음"
                  : required
                    ? "시/군/구 선택"
                    : "전체 시/군/구"}
              </option>
              {Object.keys(districts)
                .filter(Boolean)
                .map((d) => (
                  <option key={d}>{d}</option>
                ))}
            </select>
          </label>
        )}
        {towns.length > 0 && (
          <label>
            읍/면/동 (선택)
            <select
              aria-label="읍/면/동 (선택)"
              value={town}
              disabled={!towns.length}
              onChange={(e) => setTown(e.target.value)}
            >
              <option value="">전체 읍/면/동</option>
              {towns.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </label>
        )}
      </div>
      <input
        type="hidden"
        name={name}
        value={[province, district, town].filter(Boolean).join(" ")}
      />
      <small>법정동 기준 · 상세 주소는 입력하지 않아도 됩니다.</small>
    </fieldset>
  );
}
