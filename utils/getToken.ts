import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

interface TokenData {
    data: {
        accessToken: string;
        expirationTime: number;
    }
}

const TOKEN_PATH = path.resolve(__dirname, 'token.json');
const LOGIN_URL = `${process.env.API_URL}/api/usuarios/auth/sign-in`;
const LOGIN_BODY = {
    email: process.env.EMAIL,
    password: process.env.PASSWORD,
};

export const getAccessToken = async (): Promise<string> => {
    let tokenData: TokenData;

    try {
        const raw = await fs.readFile(TOKEN_PATH, 'utf-8');
        tokenData = JSON.parse(raw);
    } catch {
        // Si el archivo no existe o está corrupto, forzamos renovación
        tokenData = { data: { accessToken: '', expirationTime: 0 } };
    }

    const now = Date.now();
    const isExpired = tokenData.data.expirationTime <= now;

    if (!isExpired && tokenData.data.accessToken) {
        return tokenData.data.accessToken;
    }

    const response = await axios.post(LOGIN_URL, LOGIN_BODY);

    const newAccessToken = response.data.data.accessToken;
    const expiresIn = response.data.data.expirationTime

    const newTokenData: TokenData = {
        data:{
            accessToken:newAccessToken,
            expirationTime:expiresIn,
        }
    };

    await fs.writeFile(TOKEN_PATH, JSON.stringify(newTokenData, null, 2), 'utf-8');

    return newTokenData.data.accessToken;
}
