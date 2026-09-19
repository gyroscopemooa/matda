import sharp from "sharp";
import { mkdir } from "node:fs/promises";
const entries = [
  ["19f79584-f199-498c-bec9-b9952990de45.png", 130, 130, 1375, 780],
  ["20bf4351-4c83-469f-80f2-fc68bcf7c4c1.png", 270, 105, 1230, 650],
  ["1429f313-c0a4-4ef3-8246-6519813df6c1.png", 205, 300, 850, 650],
  ["7194f362-2e66-40fd-babe-cbaa04505844.png", 310, 210, 640, 830],
  ["0260d60a-8040-4c26-89ae-e9482a19b2ba.png", 180, 315, 970, 610],
  ["1860c7da-2b0d-46b3-b183-57c27ea83bc9.png", 275, 335, 700, 575],
  ["5f1313bb-f091-4477-8b1f-e8230f15418c.png", 85, 175, 310, 190],
];
await mkdir("public/brand", { recursive: true });
for (const [index, [file, left, top, width, height]] of entries.entries()) {
  await sharp(`C:/Users/jeonm/Downloads/${file}`)
    .extract({ left, top, width, height })
    .resize({ width: 600, withoutEnlargement: true })
    .webp({ quality: 90 })
    .toFile(`public/brand/candidate-${index + 1}.webp`);
}
