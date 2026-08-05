import express from 'express';
import { apiErrorResult, dispatchApiRequest } from './api-handler.mjs';

const app = express();

app.use(express.json({ limit: '10mb' }));

app.use('/api', async (request, response, next) => {
  try {
    const result = await dispatchApiRequest({
      method: request.method,
      pathname: new URL(request.originalUrl, 'http://localhost').pathname,
      authorization: request.headers.authorization || '',
      body: request.body || {},
      allowBootstrap: process.env.NODE_ENV === 'test',
    });
    response.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  const result = error instanceof SyntaxError
    ? { status: 400, body: { error: 'Isi JSON request tidak valid.' } }
    : apiErrorResult(error);
  response.status(result.status).json(result.body);
});

export default app;
