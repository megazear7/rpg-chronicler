import express from "express";
import { router } from "./main.router.js";
import { loggingMiddleware } from "./main.logging.js";
import { errorHandler } from "./main.errors.js";
import { env } from "./main.env.js";
import "./main.errors.js";
import { notFound } from "./main.not-found.js";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.static("dist/client"));
app.use(express.static("dist/shared"));
app.use(express.static("src/static"));
app.use(loggingMiddleware);
app.use(router);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(env.APP_PORT, () => console.log(`Example app listening on port ${env.APP_PORT}`));
server.timeout = 0; // Disable server timeout for long-running prompt requests
