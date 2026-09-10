import type { Request, Response } from 'express';
import { TicketSchema, type Ticket } from '../models/ticket.js';
import { parse } from 'csv-parse';
import { pipeline } from 'node:stream/promises';
import fs from 'node:fs';
import { pool } from '../config/db.js';
import { BadRequestError, UnsupportedMediaTypeError } from '../errors/httpErrors.js';

export const bulkImport = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new BadRequestError('No file uploaded');
  }

  if (req.file.mimetype !== 'text/csv') {
    throw new UnsupportedMediaTypeError('File must be a CSV');
  }

  const filePath = req.file.path;
  try {
    const result = await parseCSV(filePath);

    if (result.imported_count === 0 && result.total_rows > 0) {
      res.status(422).json(result);
      return;
    }

    res.status(201).json(result);
  } finally {
    fs.unlink(filePath, (err) => {
      if (err) req.log.error(err, 'Failed to remove temp upload file');
    });
  }
};

// A 100 MB CSV whose every row is invalid would otherwise build one error
// object per row and serialize the lot into a single JSON response. `failed`
// keeps counting past the cap, only the reported detail stops growing.
const MAX_REPORTED_ERRORS = 100;

async function parseCSV(filePath: string) {
    let imported = 0, failed = 0;
    const parser = parse({
      columns: true,
      skip_empty_lines: true
    });
    const errors: { row: number; message: string }[] = [];

    // If we throw from inside the `for await` below, node destroys the
    // upstream streams (the real file) and the `pipeline` promise rejects
    // with a generic AbortError, not with our error. We capture it in
    // `pendingError` and rethrow it ourselves outside the try/catch, after
    // pipeline has done its cleanup. The inner try/catch wraps the whole
    // loop body, not just the header check, so a failure from insertBatch
    // (e.g. the DB connection dropping mid-import) is captured too.
    let pendingError: unknown;

    try {
      await pipeline(
        fs.createReadStream(filePath),
        parser,
        async function (parsedRows) {
          try {
            const batch: Ticket[] = [];
            let isFirstRow = true;
            for await (const row of parsedRows) {
              if (isFirstRow) {
                isFirstRow = false;
                const expected = Object.keys(TicketSchema.shape);
                const received = Object.keys(row);
                const missing = expected.filter((col) => !received.includes(col));
                if (missing.length > 0) {
                  throw new BadRequestError(`wrong CSV headers, missing: ${missing.join(', ')}`);
                }
              }
              const result = TicketSchema.safeParse(row);
              if (result.success) {
                batch.push(result.data);
                if (batch.length === 1000) {
                  await insertBatch(batch);   // qui il ciclo ASPETTA davvero prima di leggere la prossima riga
                  imported += batch.length;
                  batch.length = 0;
                }
              } else {
                failed++;
                if (errors.length < MAX_REPORTED_ERRORS) {
                  errors.push({ row: parser.info.records, message: result.error.issues[0]?.message ?? 'Invalid row' });
                }
              }
            }
            if (batch.length > 0) {
              await insertBatch(batch);
              imported += batch.length;
            }
          } catch (err) {
            pendingError = err;
            throw err;
          }
        },
      );
    } catch (err) {
      throw pendingError ?? err;
    }

  return {
    total_rows: imported + failed,
    imported_count: imported,
    failed_count: failed,
    errors,
    errors_truncated: failed > errors.length,
  };
}


async function insertBatch(batch: Ticket[]) {
  if (batch.length === 0) return;

  const columns = Object.keys(batch[0]!);
  const values: unknown[] = [];
  const rowGroups = batch.map((row, i) => {
    const rowValues = columns.map((col) => row[col as keyof Ticket]);
    const placeholders = rowValues.map((_, j) => `$${i * columns.length + j + 1}`);
    values.push(...rowValues);
    return `(${placeholders.join(', ')})`;
  });
  const sql = `INSERT INTO tickets (${columns.join(', ')}) VALUES ${rowGroups.join(', ')} ON CONFLICT (ticket_id) DO NOTHING`;
  return pool.query(sql, values);
}