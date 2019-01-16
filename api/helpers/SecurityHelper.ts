import * as crypto from "crypto";

export function genHash(password, salt): Promise<string> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, new Buffer(salt, "hex"), 100000, 512, "sha512", (err, key) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(key.toString("hex"));
    });
  });
}

export async function genPassword(password: string): Promise<{ salt: string; hash: string }> {
  const salt = crypto.randomBytes(128).toString("hex");
  return { salt, hash: await genHash(password, salt) };
}

