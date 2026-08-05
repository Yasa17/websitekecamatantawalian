import assert from 'node:assert/strict';
import test from 'node:test';
import { databasePool, withDatabaseClient } from './database.mjs';

const delay = () => new Promise((resolve) => setImmediate(resolve));

const createClient = (name) => ({
  async query(value) {
    await delay();
    return `${name}:${value}`;
  },
});

test('client database tetap terisolasi pada request yang berjalan bersamaan', async () => {
  const [first, second] = await Promise.all([
    withDatabaseClient(createClient('first'), async () => {
      await delay();
      const direct = await databasePool.query('direct');
      const transactionClient = await databasePool.connect();
      const transaction = await transactionClient.query('transaction');
      transactionClient.release();
      return { direct, transaction };
    }),
    withDatabaseClient(createClient('second'), async () => {
      const direct = await databasePool.query('direct');
      await delay();
      return direct;
    }),
  ]);

  assert.deepEqual(first, {
    direct: 'first:direct',
    transaction: 'first:transaction',
  });
  assert.equal(second, 'second:direct');
});
