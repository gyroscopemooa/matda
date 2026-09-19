"use client";
import { useState } from "react";
import RegionPicker from "./region-picker";
export default function ServiceLocation({
  region = "",
  mode = "local",
}: {
  region?: string;
  mode?: string;
}) {
  const [selected, setSelected] = useState(
    mode === "online" ? "online" : "local",
  );
  return (
    <div className="service-location">
      <fieldset className="service-mode-picker">
        <legend>서비스 방식</legend>
        <div className="service-mode-options">
          {[
            ["local", "지역 서비스"],
            ["online", "전국·온라인 가능"],
          ].map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="serviceMode"
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {selected === "local" ? (
        <RegionPicker value={region} required />
      ) : (
        <>
          <input type="hidden" name="region" value="" />
          <p className="muted small">
            지역 제한 없이 요청합니다. 온라인 작업인지, 전국 방문 가능한 일인지
            본문에 적어주세요.
          </p>
        </>
      )}
    </div>
  );
}
