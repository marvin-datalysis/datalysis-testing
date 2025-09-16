import fs from 'fs/promises';
import path from 'path';
import axios, { AxiosError } from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

interface TokenData {
  data: {
    accessToken: string;
    expirationTime: number;
  }
}

const TOKEN_PATH = path.resolve(__dirname, 'token.json');

// 1) Usa API_URL del .env
const API_URL = process.env.API_URL; // p.ej. http://localhost:8080
if (!API_URL) {
  throw new Error('API_URL no está definido en .env');
}

// 2) Fallback: si no hay EMAIL/PASSWORD, usa USUARIO_QA/PASSWORD_QA
const EMAIL = process.env.EMAIL ?? process.env.USUARIO_QA ?? '';
const PASSWORD = process.env.PASSWORD ?? process.env.PASSWORD_QA ?? '';

const LOGIN_URL = `${API_URL}/api/usuarios/auth/sign-in`;
const LOGIN_BODY = { email: EMAIL, password: PASSWORD };

export const getAccessToken = async (): Promise<string> => {
  if (!EMAIL || !PASSWORD) {
    throw new Error('Credenciales de API no definidas: faltan EMAIL/PASSWORD (o USUARIO_QA/PASSWORD_QA) en .env');
  }

  let tokenData: TokenData;

  try {
    const raw = await fs.readFile(TOKEN_PATH, 'utf-8');
    tokenData = JSON.parse(raw);
  } catch {
    tokenData = { data: { accessToken: '', expirationTime: 0 } };
  }

  const now = Date.now();
  const isExpired = tokenData.data.expirationTime <= now;

  if (!isExpired && tokenData.data.accessToken) {
    return tokenData.data.accessToken;
  }

  try {
    const response = await axios.post(LOGIN_URL, LOGIN_BODY, {
      headers: { 'Content-Type': 'application/json' },
      // timeout opcional:
      timeout: 15000,
    });

    const newAccessToken = response.data?.data?.accessToken;
    const expiresIn = response.data?.data?.expirationTime;

    if (!newAccessToken || !expiresIn) {
      throw new Error(`Respuesta inesperada del login: ${JSON.stringify(response.data)}`);
    }

    const newTokenData: TokenData = {
      data: { accessToken: newAccessToken, expirationTime: expiresIn }
    };

    await fs.writeFile(TOKEN_PATH, JSON.stringify(newTokenData, null, 2), 'utf-8');
    return newTokenData.data.accessToken;
  } catch (err) {
    // Diagnóstico detallado
    const axerr = err as AxiosError<any>;
    const status = axerr.response?.status;
    const data = axerr.response?.data;
    throw new Error(
      `Fallo al obtener token (${status ?? 'sin status'}). URL=${LOGIN_URL}. ` +
      `BodyEnviado=${JSON.stringify(LOGIN_BODY)}. ` +
      `Respuesta=${typeof data === 'object' ? JSON.stringify(data) : data}`
    );
  }
};