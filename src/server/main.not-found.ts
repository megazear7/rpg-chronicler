import express from "express";
import { page } from "./main.page.js";

const notFound = express.Router();

notFound.all("/api/{*any}", (_req, res) => {
  console.log(`Not Found API request: ${_req.method} ${_req.path}`);
  res.status(404).json({ error: "Not Found" });
});

notFound.all("/{*any}", (_req, res) => {
  console.log(`Not Found Page request: ${_req.method} ${_req.path}`);
  res.status(404).send(page());
});

export { notFound };
