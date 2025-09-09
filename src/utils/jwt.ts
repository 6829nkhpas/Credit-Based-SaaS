import * as jwt from 'jsonwebtoken';

export function signJWT(payload: object, secret: string, expiresIn: string): string {
  return jwt.sign(payload, secret, { expiresIn });
}

export function verifyJWT(token: string, secret: string): any {
  return jwt.verify(token, secret);
}
