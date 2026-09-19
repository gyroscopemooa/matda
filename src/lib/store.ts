import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { validateEnvironment } from "./env";
import type { Database, Row } from "./types";
const directory = path.resolve(
  /* turbopackIgnore: true */ process.env.LOCAL_DATA_DIR || ".local",
);
const filename = path.join(directory, "database.json");
const globalStore = globalThis as typeof globalThis & {
  matdaQueue?: Promise<unknown>;
};
export function seed(): Database {
  const now = new Date().toISOString();
  const items = [
    [
      "request",
      "이번 주말 입주청소 도와주실 분 구해요",
      "다음 주에 이사를 앞두고 있어요. 24평 아파트 입주청소 가능하신 분 계실까요?",
      "청소",
    ],
    [
      "question",
      "벽걸이 에어컨 설치, 보통 얼마 정도 하나요?",
      "이사하면서 에어컨을 옮기려고 해요. 배관 길이에 따라 비용 차이가 큰가요? 경험을 나눠주세요.",
      "수리·설치",
    ],
    [
      "review",
      "이웃 추천으로 만난 이사업체, 정말 만족했어요",
      "약속 시간도 잘 지켜주시고 가구를 꼼꼼하게 포장해 주셨어요. 덕분에 기분 좋게 이사했습니다.",
      "이사·운송",
    ],
    [
      "request",
      "작은 방 도배 가능하신 분 찾습니다",
      "아이 방 벽지를 바꾸려고 합니다. 일정은 서로 맞추면 좋겠어요.",
      "인테리어·시공",
    ],
    [
      "question",
      "첫 차 엔진오일 교환, 어디서 하시나요?",
      "동네에서 믿고 맡길 수 있는 정비소가 궁금해요.",
      "자동차",
    ],
  ];
  const rows: Row[] = items.map((item, i) => ({
    id: `sample-${i}`,
    ownerId: `seed-${i}`,
    kind: "post",
    createdAt: now,
    updatedAt: now,
    type: item[0],
    title: item[1],
    body: item[2],
    category: item[3],
    region: "서울 강남구",
    audience: "consumer",
    authorName: [
      "따뜻한이웃",
      "주말의집",
      "초록나무",
      "강남생활",
      "새로운시작",
    ][i],
    status: "published",
    images: [],
    sample: true,
  }));
  return { users: [], sessions: [], rows };
}
async function load(): Promise<Database> {
  try {
    return JSON.parse(await readFile(filename, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return seed();
    if (e instanceof SyntaxError) {
      // Local preview data is disposable. Preserve a corrupt file for
      // inspection, then let the preview recover instead of failing every API
      // request until someone repairs the file by hand.
      const backup = path.join(directory, `database.corrupt-${Date.now()}.json`);
      await rename(filename, backup);
      return seed();
    }
    throw e;
  }
}
export async function transact<T>(
  fn: (db: Database) => T | Promise<T>,
): Promise<T> {
  validateEnvironment();
  const previous = globalStore.matdaQueue ?? Promise.resolve();
  const task = previous
    .catch(() => {})
    .then(async () => {
      await mkdir(directory, { recursive: true });
      const db = await load();
      const result = await fn(db);
      const temp = path.join(directory, `${randomUUID()}.tmp`);
      await writeFile(temp, JSON.stringify(db), "utf8");
      await rename(temp, filename);
      return result;
    });
  globalStore.matdaQueue = task.then(
    () => {},
    () => {},
  );
  return task;
}
