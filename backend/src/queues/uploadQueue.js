import Queue from 'bull';
import path from 'path';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// queue name: upload-processing
// Redis/Bull queue has been replaced by a MongoDB-backed queue and worker.
// This module is kept as a shim to avoid import errors. Do not use.
export default null;
