import { AppError } from "./types";

export function quoteDocument(
  file: { name: string; size: number },
  bytes: Buffer,
) {
  if (!file.size || file.size > 10 * 1024 * 1024)
    throw new AppError("견적서는 10MB 이하만 첨부해주세요.");
  const ext = file.name.split(".").pop()?.toLowerCase();
  const mime =
    ext === "pdf" && bytes.toString("ascii", 0, 5) === "%PDF-"
      ? "application/pdf"
      : ext === "png" &&
          bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? "image/png"
        : ["jpg", "jpeg"].includes(ext || "") &&
            bytes[0] === 255 &&
            bytes[1] === 216 &&
            bytes[2] === 255
          ? "image/jpeg"
          : ext === "webp" &&
              bytes.toString("ascii", 0, 4) === "RIFF" &&
              bytes.toString("ascii", 8, 12) === "WEBP"
            ? "image/webp"
            : ["zip", "docx", "xlsx"].includes(ext || "") &&
                bytes.toString("ascii", 0, 2) === "PK"
              ? {
                  zip: "application/zip",
                  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                }[ext as "zip" | "docx" | "xlsx"]
              : "";
  if (!mime)
    throw new AppError(
      "올바른 PDF·JPG·PNG·WebP·DOCX·XLSX·ZIP 파일을 선택해주세요.",
    );
  return {
    mime,
    name:
      file.name.replace(/[\\/\x00-\x1f\x7f]/g, "_").slice(0, 180) || "견적서",
  };
}
