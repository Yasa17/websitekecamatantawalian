import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import app from './app.mjs';
import { closeDatabase } from './database.mjs';
import { runMigrations } from './migrations.mjs';
import { configureNodeDatabase } from './node-database.mjs';
import express from 'express';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(serverDirectory, '..');
const port = Number(process.env.PORT || 8787);

await configureNodeDatabase();
await runMigrations();

app.use('/assets', express.static(path.join(projectDirectory, 'dist', 'assets')));
app.use(express.static(path.join(projectDirectory, 'dist')));
app.use((_request, response) => {
  response.sendFile(path.join(projectDirectory, 'dist', 'index.html'));
});

const httpServer = app.listen(port, () => {
  console.log(`Backend Portal Tawalian berjalan di http://localhost:${port}`);
});

let isClosing = false;
const shutdown = () => {
  if (isClosing) return;
  isClosing = true;
  httpServer.close(async () => {
    await closeDatabase();
  });
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
