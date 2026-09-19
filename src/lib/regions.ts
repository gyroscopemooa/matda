import data from "./regions-data.json";
export const regions: Record<string, Record<string, string[]>> = data;
const aliases: Record<string, string> = {
  서울: "서울특별시",
  부산: "부산광역시",
  대구: "대구광역시",
  인천: "인천광역시",
  광주: "광주광역시",
  대전: "대전광역시",
  울산: "울산광역시",
  세종: "세종특별자치시",
  경기: "경기도",
  강원: "강원특별자치도",
  강원도: "강원특별자치도",
  충북: "충청북도",
  충남: "충청남도",
  전북: "전북특별자치도",
  전라북도: "전북특별자치도",
  전남: "전라남도",
  경북: "경상북도",
  경남: "경상남도",
  제주: "제주특별자치도",
};
export function normalizeRegion(value: string) {
  const parts = value.trim().split(/\s+/);
  parts[0] = aliases[parts[0]] || parts[0];
  return parts.join(" ");
}
export function splitRegion(value: string) {
  const normalized = normalizeRegion(value);
  const province = normalized.split(" ")[0];
  if (!regions[province]) return { province: "", district: "", town: "" };
  const rest = normalized.slice(province.length).trim();
  const district =
    Object.keys(regions[province])
      .sort((a, b) => b.length - a.length)
      .find((d) => !d || rest === d || rest.startsWith(d + " ")) || "";
  const town = rest.slice(district.length).trim();
  return {
    province,
    district,
    town: regions[province][district]?.includes(town) ? town : "",
  };
}
export function validRegion(value: string, requireDistrict = false) {
  const normalized = normalizeRegion(value);
  const { province, district, town } = splitRegion(normalized);
  return (
    !!province &&
    (!requireDistrict || !!district || province === "세종특별자치시") &&
    [province, district, town].filter(Boolean).join(" ") === normalized
  );
}
export function matchesRegion(value: string, filter: string) {
  if (!filter || filter === "전체 지역") return true;
  const v = normalizeRegion(value),
    f = normalizeRegion(filter);
  return v === f || v.startsWith(f + " ");
}
