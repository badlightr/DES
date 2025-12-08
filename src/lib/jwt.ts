import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const ACCESS_EXP = process.env.JWT_ACCESS_EXP || "15m";

export function signAccessToken(payload: object) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_EXP });
}

export function verifyAccessToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}
