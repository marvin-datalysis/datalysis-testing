import { test, expect } from '@playwright/test';
import { queryDB } from '../../utils/db';

test('Conexión a DB funcionando', async () => {
  const rows = await queryDB('SELECT 1 AS test');
  console.log(rows);
  expect(rows[0].test).toBe(1);
});
