import { Client } from 'pg';

export async function queryDB(sql: string, params: any[] = [], overrideDb?: string) {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: overrideDb ?? process.env.POSTGRES_DB, // si viene override usa "demo"
    port: 5432,
  });

  await client.connect();
  const result = await client.query(sql, params);
  await client.end();

  return result.rows;
}

