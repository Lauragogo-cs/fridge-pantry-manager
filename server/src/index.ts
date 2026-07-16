import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import authRouter from "./routes/auth.js";
import itemsRouter from "./routes/items.js";
import statsRouter from "./routes/stats.js";
import barcodeRouter from "./routes/barcode.js";
import householdRouter from "./routes/household.js";
import pushRouter from "./routes/push.js";
import recipesRouter from "./routes/recipes.js";
import { startNotifyScheduler } from "./notifyScheduler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRouter);
app.use("/api/items", itemsRouter);
app.use("/api/stats", statsRouter);
app.use("/api/barcode", barcodeRouter);
app.use("/api/household", householdRouter);
app.use("/api/push", pushRouter);
app.use("/api/recipes", recipesRouter);

// Serve the built frontend from the same origin/port as the API. This lets
// the whole app (frontend + backend) run as a single deployable service —
// handy for platforms with one free web service slot (e.g. Render).
// The client is expected to be built into ../../client/dist relative to
// this compiled file (server/dist/index.js -> repo root -> client/dist).
const clientDist = path.join(__dirname, "..", "..", "client", "dist");
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "服务器内部错误" });
});

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Fridge pantry manager API running at http://localhost:${port}`);
  startNotifyScheduler();
});
