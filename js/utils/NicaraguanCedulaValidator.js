/**
 * ============================================================================
 * VALIDADOR CANÓNICO DE CÉDULA NICARAGÜENSE (CSE / DGI MÓDULO 23 - ISO 7064)
 * ============================================================================
 * Implementación oficial del algoritmo de verificación de identidad ciudadana
 * de la República de Nicaragua regulado por el Consejo Supremo Electoral (CSE)
 * y la Dirección General de Ingresos (DGI).
 *
 * Estructura de Cédula (14 caracteres alfanuméricos):
 *   [001]-[010190]-[0001][N]
 *    |      |       |    +-- Letra de control verificadora (Módulo 23)
 *    |      |       +------- Consecutivo / Tomo de registro (4 dígitos)
 *    |      +--------------- Fecha de nacimiento DDMMAA (6 dígitos)
 *    +---------------------- Código de municipio de inscripción (3 dígitos)
 * ============================================================================
 */

export class NicaraguanCedulaValidator {
  /**
   * Alfabeto oficial CSE de 23 letras (omite I, O, Z y Ñ para prevenir fraudes,
   * confusiones visuales y asegurar compatibilidad ASCII).
   */
  static LETTERS = "ABCDEFGHJKLMNPQRSTUVWXY";

  /**
   * Letras explícitamente prohibidas en el documento de identidad.
   */
  static FORBIDDEN_LETTERS = ["I", "O", "Z", "\u00D1"];

  /**
   * Expresión regular de segmentación (admite guiones opcionales).
   */
  static REGEX = /^(\d{3})-?(\d{6})-?(\d{4})([A-Za-z\u00D1\u00F1])$/;

  /**
   * Normaliza la cadena removiendo caracteres no alfanuméricos y pasando a mayúsculas.
   * @param {string} raw - Cadena sin procesar
   * @returns {string} Cadena limpia en mayúsculas
   */
  static clean(raw) {
    return (raw || "").trim().toUpperCase().replace(/[^0-9A-Z]/g, "");
  }

  /**
   * Formatea progresivamente la entrada con la máscara estándar ###-######-####@.
   * @param {string} raw - Cadena de entrada
   * @returns {string} Formato con guiones
   */
  static format(raw) {
    const cleaned = (raw || "").toUpperCase().replace(/[^0-9A-Z]/g, "");
    const digits = cleaned.slice(0, 13).replace(/[^0-9]/g, "");
    const letter = cleaned.slice(13, 14).replace(/[^A-Z]/g, "");

    let res = "";
    if (digits.length > 0) res += digits.slice(0, 3);
    if (digits.length > 3) res += "-" + digits.slice(3, 9);
    if (digits.length > 9) res += "-" + digits.slice(9, 13);
    if (letter) res += letter;
    return res;
  }

  /**
   * Calcula la letra de control oficial mediante Módulo 23 sobre los 13 dígitos numéricos.
   * Utiliza BigInt para garantizar precisión aritmética absoluta sin desbordamiento.
   * @param {string} digits13 - Cadena de 13 dígitos numéricos
   * @returns {string|null} Letra verificadora esperada
   */
  static calculateChecksumLetter(digits13) {
    if (!digits13 || digits13.length !== 13 || !/^\d{13}$/.test(digits13)) return null;
    const num = BigInt(digits13);
    const remainder = Number(num % 23n);
    return this.LETTERS.charAt(remainder);
  }

  /**
   * Valida la coherencia de la fecha de nacimiento DDMMAA en el calendario gregoriano.
   * Infiere el siglo según convención: AA >= 27 -> 1900s, AA < 27 -> 2000s.
   * Valida correctamente años bisiestos (ej: 29 de febrero de 2004).
   * @param {string} ddmmaa - Segmento de 6 dígitos de fecha
   * @returns {boolean} True si la fecha existe en el calendario
   */
  static validateDate(ddmmaa) {
    if (!ddmmaa || ddmmaa.length !== 6 || !/^\d{6}$/.test(ddmmaa)) return false;
    const d = parseInt(ddmmaa.slice(0, 2), 10);
    const m = parseInt(ddmmaa.slice(2, 4), 10);
    const yShort = parseInt(ddmmaa.slice(4, 6), 10);

    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;

    const year = yShort >= 27 ? 1900 + yShort : 2000 + yShort;
    const daysInMonth = new Date(year, m, 0).getDate();
    return d <= daysInMonth;
  }

  /**
   * Valida de manera integral una cédula de identidad nicaragüense.
   * Realiza validación de formato, código de municipio, fecha de nacimiento,
   * letras prohibidas y verificación matemática del residuo Módulo 23.
   * @param {string} cedula - Número de cédula a validar
   * @returns {object} Resultado detallado de validación
   */
  static validate(cedula) {
    const raw = (cedula || "").trim().toUpperCase();
    const match = raw.match(this.REGEX);
    if (!match) {
      return { isValid: false, reason: "Formato inválido. Debe ser 001-XXXXXX-XXXXL." };
    }

    const [, muni, ddmmaa, seq, letter] = match;
    const digits13 = muni + ddmmaa + seq;

    if (this.FORBIDDEN_LETTERS.includes(letter)) {
      return { isValid: false, reason: `Letra '${letter}' no autorizada en alfabeto oficial CSE (Módulo 23).` };
    }

    const muniNum = parseInt(muni, 10);
    if (muniNum < 1 || muniNum > 650) {
      return { isValid: false, reason: "Código de municipio no registrado." };
    }

    if (!this.validateDate(ddmmaa)) {
      return { isValid: false, reason: "Fecha de nacimiento inexistente en calendario." };
    }

    const expectedLetter = this.calculateChecksumLetter(digits13);
    if (letter !== expectedLetter) {
      return {
        isValid: false,
        reason: `Letra verificadora errónea (Esperada: '${expectedLetter}', Recibida: '${letter}').`,
        expectedLetter
      };
    }

    return {
      isValid: true,
      formatted: `${muni}-${ddmmaa}-${seq}${letter}`,
      municipalityCode: muni,
      birthDateStr: ddmmaa,
      sequence: seq,
      verificationLetter: letter
    };
  }
}

export default NicaraguanCedulaValidator;
