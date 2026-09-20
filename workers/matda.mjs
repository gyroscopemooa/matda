import handler from "../.open-next/worker.js";
import { scheduled } from "./guide-scheduled.mjs";

export * from "../.open-next/worker.js";
export default { ...handler, scheduled };
