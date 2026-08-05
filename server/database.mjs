import { AsyncLocalStorage } from 'node:async_hooks';

const requestDatabaseStorage = new AsyncLocalStorage();
let defaultDatabase;

const getDefaultDatabase = () => {
  if (!defaultDatabase) {
    throw new Error('Koneksi database lokal belum dikonfigurasi.');
  }
  return defaultDatabase;
};

const createPoolClientFacade = (client) => new Proxy(client, {
  get(target, property) {
    if (property === 'release') return () => {};
    const value = Reflect.get(target, property, target);
    return typeof value === 'function' ? value.bind(target) : value;
  },
});

export const databasePool = {
  query(...args) {
    const requestDatabase = requestDatabaseStorage.getStore();
    return (requestDatabase?.client || getDefaultDatabase()).query(...args);
  },
  connect(...args) {
    const requestDatabase = requestDatabaseStorage.getStore();
    if (requestDatabase) return Promise.resolve(requestDatabase.poolClient);
    return getDefaultDatabase().connect(...args);
  },
};

export const setDefaultDatabase = (database) => {
  if (!database || typeof database.query !== 'function') {
    throw new TypeError('Database default harus menyediakan fungsi query().');
  }
  if (defaultDatabase && defaultDatabase !== database) {
    throw new Error('Database default sudah dikonfigurasi.');
  }
  defaultDatabase = database;
  return defaultDatabase;
};

export const withDatabaseClient = (client, callback) => {
  if (!client || typeof client.query !== 'function') {
    throw new TypeError('Client database request tidak valid.');
  }
  return requestDatabaseStorage.run(
    { client, poolClient: createPoolClientFacade(client) },
    callback,
  );
};

export const closeDatabase = async () => {
  if (!defaultDatabase) return;
  const database = defaultDatabase;
  defaultDatabase = undefined;
  if (typeof database.end === 'function') await database.end();
};
