import mongoose from 'mongoose';
export function createDatabase(config) {
  const connection = mongoose.createConnection();
  connection.on('error', () => console.error('MongoDB connection error'));
  return {
    async connect() {
      await connection.openUri(config.mongodbUri, {
        serverSelectionTimeoutMS: config.dbTimeoutMs,
        connectTimeoutMS: config.dbTimeoutMs,
        heartbeatFrequencyMS: 1000,
        bufferCommands: false,
      });
    },
    async isReady() {
      if (connection.readyState !== 1) return false;
      try {
        await connection.db.admin().ping({ timeoutMS: config.dbTimeoutMs });
        return connection.readyState === 1;
      } catch {
        return false;
      }
    },
    async disconnect() {
      await connection.close();
    },
  };
}
