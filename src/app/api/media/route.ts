import { NextResponse } from "next/server";
import { remoteEnabled } from "@/lib/community-repository";
import { remoteMedia } from "@/lib/community-api";
import { randomUUID, createHmac, timingSafeEqual } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";
import { transact } from "@/lib/store";
import { canRead, canReadMedia } from "@/lib/domain";
import {
  currentUser,
  needUser,
  sessionToken,
  checkOrigin,
  rateLimit,
} from "@/lib/auth";
import { AppError } from "@/lib/types";
export const runtime = "nodejs";
const root = path.resolve(process.env.LOCAL_DATA_DIR || ".local", "uploads");
const extensions = new Set([
  "pdf",
  "xlsx",
  "xls",
  "doc",
  "docx",
  "zip",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "dwg",
]);
const key = process.env.LOCAL_SIGNING_SECRET;
const sign = (id: string, userId: string, expiry: string) =>
  createHmac("sha256", key || "local-preview-only")
    .update(`${id}:${userId}:${expiry}`)
    .digest("hex");
export async function POST(request: Request) {
  if (remoteEnabled()) return remoteMedia(request);
  try {
    checkOrigin(request);
    const token = await sessionToken();
    const form = await request.formData();
    const file = form.get("file");
    if (
      !(file instanceof File) ||
      file.size === 0 ||
      file.size > 10 * 1024 * 1024
    )
      throw new AppError("파일은 10MB 이하만 첨부해주세요.");
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    if (!extensions.has(ext))
      throw new AppError("허용되지 않는 파일 형식입니다.");
    const bytes = Buffer.from(await file.arrayBuffer());
    const image =
      ext === "png"
        ? bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : ["jpg", "jpeg"].includes(ext)
          ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
          : ext === "webp"
            ? bytes.toString("ascii", 0, 4) === "RIFF" &&
              bytes.toString("ascii", 8, 12) === "WEBP"
            : false;
    if (image && file.size > 2 * 1024 * 1024)
      throw new AppError("사진은 2MB 이하만 첨부해주세요.");
    const visibility =
      form.get("visibility") === "public" ? "public" : "private";
    if (["png", "jpg", "jpeg", "webp"].includes(ext) && !image)
      throw new AppError("올바른 이미지 파일이 아닙니다.");
    if (ext === "pdf" && bytes.toString("ascii", 0, 5) !== "%PDF-")
      throw new AppError("올바른 PDF 파일이 아닙니다.");
    if (
      ["zip", "xlsx", "docx"].includes(ext) &&
      bytes.toString("ascii", 0, 2) !== "PK"
    )
      throw new AppError("올바른 문서 파일이 아닙니다.");
    if (visibility === "public" && !image)
      throw new AppError("공개 첨부는 JPG·PNG·WebP 사진만 가능합니다.");
    const id = randomUUID();
    const result = await transact(async (db) => {
      const user = needUser(currentUser(db, token));
      rateLimit("upload:" + user.id, 20);
      const targetId = String(form.get("targetId") || "");
      if (visibility === "private" || targetId) {
        const target = db.rows.find((r) => r.id === targetId);
        if (!target || !canRead(db, target, user) || target.ownerId !== user.id)
          throw new AppError("본인 문서에만 첨부할 수 있습니다.", 403);
      }
      const target = db.rows.find((r) => r.id === targetId);
      if (target?.kind === "quote") {
        const post = db.rows.find(
          (r) => r.kind === "post" && r.id === target.postId,
        );
        if (
          !post ||
          post.status !== "published" ||
          post.selectedQuoteId ||
          Date.parse(String(post.expiresAt)) <= Date.now()
        )
          throw new AppError("모집 중인 견적에만 첨부할 수 있습니다.", 403);
      }
      if (
        target &&
        visibility === "public" &&
        !["post", "provider"].includes(target.kind)
      )
        throw new AppError("업무 문서는 비공개로만 첨부할 수 있습니다.", 403);
      if (target?.kind === "bid") {
        const tender = db.rows.find((r) => r.id === target.tenderId);
        if (
          !tender ||
          Date.now() >= Date.parse(String(tender.deadline)) ||
          tender.status !== "published" ||
          target.status !== "submitted"
        )
          throw new AppError("투찰 마감 후에는 첨부를 바꿀 수 없습니다.", 403);
      }
      if (
        target?.kind === "provider" &&
        db.rows.filter((r) => r.kind === "media" && r.targetId === targetId)
          .length >= 20
      )
        throw new AppError("포트폴리오는 20장까지 가능합니다.");
      await mkdir(root, { recursive: true });
      await writeFile(path.join(root, id), bytes);
      const row = {
        id,
        ownerId: user.id,
        kind: "media",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        name: file.name.slice(0, 180),
        size: file.size,
        mime: image
          ? ext === "jpg" || ext === "jpeg"
            ? "image/jpeg"
            : `image/${ext}`
          : "application/octet-stream",
        visibility,
        targetId,
        bidVersion:
          target?.kind === "bid" ? (target.versions as unknown[]).length : null,
      };
      db.rows.push(row);
      return row;
    });
    return NextResponse.json({ media: result });
  } catch (e) {
    return fail(e);
  }
}
export async function GET(request: Request) {
  if (remoteEnabled()) return remoteMedia(request);
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const token = await sessionToken();
    const result = await transact((db) => {
      const row = db.rows.find((r) => r.id === id && r.kind === "media");
      if (!row) throw new AppError("파일을 찾을 수 없습니다.", 404);
      const user = currentUser(db, token);
      if (row.visibility === "private") {
        needUser(user);
        if (!canReadMedia(db, row, user))
          throw new AppError("문서 접근 권한이 없습니다.", 403);
        const expiry = url.searchParams.get("expires");
        const signature = url.searchParams.get("signature");
        if (!expiry || !signature) {
          const expires = String(Date.now() + 60000);
          return {
            link: `/api/media?id=${row.id}&expires=${expires}&signature=${sign(row.id, user!.id, expires)}`,
          };
        }
        const expected = sign(row.id, user!.id, expiry);
        if (
          !Number.isFinite(Number(expiry)) ||
          Number(expiry) < Date.now() ||
          !/^[0-9a-f]{64}$/.test(signature) ||
          signature.length !== expected.length ||
          !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
        )
          throw new AppError("다운로드 링크가 만료되었습니다.", 403);
      }
      return { row };
    });
    if ("link" in result) return NextResponse.json({ url: result.link });
    const row = result.row!;
    const bytes = await readFile(path.join(root, row.id));
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": String(row.mime),
        "Content-Disposition": `${row.visibility === "public" ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(String(row.name))}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control":
          row.visibility === "public"
            ? "public, max-age=60"
            : "private, no-store",
      },
    });
  } catch (e) {
    return fail(e);
  }
}
function fail(e: unknown) {
  return NextResponse.json(
    { error: e instanceof AppError ? e.message : "파일 처리에 실패했습니다." },
    { status: e instanceof AppError ? e.status : 500 },
  );
}
