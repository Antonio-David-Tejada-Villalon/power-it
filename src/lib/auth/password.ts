import bcrypt from "bcryptjs";
import { z } from "zod";

const ROUNDS = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, ROUNDS);
}

export function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Lista corta de las contraseñas más adivinadas en cualquier lista pública de
// credenciales filtradas — no reemplaza un chequeo contra HaveIBeenPwned,
// pero bloquea el caso más obvio de fuerza bruta sin pedir un servicio externo.
const COMMON_PASSWORDS = new Set([
  "password",
  "password1",
  "12345678",
  "123456789",
  "11111111",
  "qwertyui",
  "qwerty123",
  "admin1234",
  "abc12345",
  "contraseña",
  "contrasena",
  "contrasena1",
]);

export const PasswordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .refine((value) => /[a-zA-Z]/.test(value) && /[0-9]/.test(value), {
    message: "La contraseña debe combinar letras y números",
  })
  .refine((value) => !COMMON_PASSWORDS.has(value.toLowerCase()), {
    message: "Esa contraseña es demasiado común, elegí una distinta",
  });
