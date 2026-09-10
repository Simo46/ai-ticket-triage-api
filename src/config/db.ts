import { Pool } from 'pg';
import { dbConfig } from './config.js';

export const pool = new Pool(dbConfig);