import { Client } from 'pg';

export async function queryDB(sql: string, params: any[] = []) {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB, // .env
    port: 5432,
  });

  await client.connect();

  const result = await client.query(sql, params);

  await client.end();

  return result.rows;
}
