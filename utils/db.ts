import { Client, Pool } from 'pg';

export async function queryDB(sql: string, params: any[] = [], overrideDb?: string) {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: overrideDb ?? process.env.POSTGRES_DB, // si viene override usa "demo"
    port: 5432,
    ...(process.env.POSTGRES_HOST!=='localhost' && {ssl:true})
  });

  try{
    await client.connect();
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  } finally {
    await client.end();
  }
}

export async function queryDBTransaccional(sql: string, params: any[] = [], overrideDb?: string) {
  const client = new Client({
    host: process.env.POSTGRES_TRANSACCIONAL,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: overrideDb ?? process.env.POSTGRES_DB, // si viene override usa "demo"
    port: 5432,
    ...(process.env.POSTGRES_HOST!=='localhost' && {ssl:true})
  });

  try{
    await client.connect();
    console.log(overrideDb);
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Error executing query:', error);
    throw error;
  } finally {
    await client.end();
  }
}

