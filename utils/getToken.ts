// utils/getToken.ts
import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

interface TokenData {
  data: {
    accessToken: string;
    expirationTime: number; // epoch ms
  };
}

const TOKEN_PATH = path.resolve(__dirname, 'token.json');
const API_URL = process.env.API_URL!;
const LOGIN_URL = `${API_URL}/api/usuarios/auth/sign-in`;
const EXCHANGE_URL = `${API_URL}/api/usuarios/auth/exchange-token`;

const LOGIN_BODY = {
  email: process.env.EMAIL,
  password: process.env.PASSWORD,
  rememberMe: true,
};

async function readCached(): Promise<TokenData | null> {
  try {
    const raw = await fs.readFile(TOKEN_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function writeCached(token: string, exp: number) {
  const data: TokenData = { data: { accessToken: token, expirationTime: exp } };
  await fs.writeFile(TOKEN_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * Flujo real: sign-in → exchange-token → usar ese accessToken.
 */
export const getAccessToken = async (): Promise<string> => {
  // 1) Si hay token cacheado y no expiró, úsalo
  const cached = await readCached();
  if (cached && cached.data.expirationTime > Date.now() && cached.data.accessToken) {
    return cached.data.accessToken;
  }

  // 2) Login
  const signIn = await axios.post(LOGIN_URL, LOGIN_BODY);
  const loginToken: string = signIn.data?.data?.accessToken;
  const loginExp: number = signIn.data?.data?.expirationTime;

  if (!loginToken) {
    throw new Error(`Login no devolvió accessToken. Respuesta: ${JSON.stringify(signIn.data).slice(0, 500)}`);
  }

  // 3) Exchange (muchos backends emiten un token distinto para API)
  const exchange = await axios.post(
    EXCHANGE_URL,
    undefined,
    { headers: { Authorization: `Bearer ${loginToken}` } }
  );

  const apiToken: string = exchange.data?.data?.accessToken ?? loginToken;
  const apiExp: number = exchange.data?.data?.expirationTime ?? loginExp ?? (Date.now() + 30 * 60 * 1000);

  // 4) Guardar cache
  await writeCached(apiToken, apiExp);

  return apiToken;
};