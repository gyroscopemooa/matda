"use client";
import { useState } from "react";
export default function SchedulePicker({
  mode = "flexible",
  start = "",
  end = "",
}: {
  mode?: string;
  start?: string;
  end?: string;
}) {
  const [selected, setSelected] = useState(mode);
  const [from, setFrom] = useState(start);
  return (
    <fieldset className="region-fields">
      <legend>희망 일정 (선택)</legend>
      <label className="field">
        일정 방식
        <select
          name="scheduleMode"
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="flexible">협의 가능</option>
          <option value="date">날짜 지정</option>
          <option value="range">기간 지정</option>
        </select>
      </label>
      {selected !== "flexible" && (
        <label className="field">
          {selected === "range" ? "시작일" : "희망일"}
          <input
            type="date"
            name="desiredDate"
            required
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
      )}
      {selected === "range" && (
        <label className="field">
          종료일
          <input
            type="date"
            name="desiredEndDate"
            required
            min={from || undefined}
            defaultValue={end}
          />
        </label>
      )}
      <small>
        시간대 등 자세한 일정은 내용에 적어주세요. 미정이면 협의 가능으로
        등록하세요.
      </small>
    </fieldset>
  );
}
