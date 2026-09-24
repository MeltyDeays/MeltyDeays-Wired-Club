/* Model: Token QR de Factura Física 4x1 */
export class TokenModel {
  constructor(data = {}) {
    this.tokenCode = data.tokenCode || data.token_code || "";
    this.batchId = data.batchId || data.batch_id || "";
    this.invoiceFolio = data.invoiceFolio || data.invoice_folio || "";
    this.pointsValue = Number(data.pointsValue || data.points_value || 100);
    this.securityPin = data.securityPin || data.security_pin || "";
    this.status = data.status || "ACTIVE"; // ACTIVE | CLAIMED
    this.claimedBy = data.claimedBy || data.claimed_by || null;
    this.claimedAt = data.claimedAt || data.claimed_at || null;
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
  }

  isClaimed() {
    return this.status === "CLAIMED";
  }

  claim(userUid) {
    if (this.isClaimed()) throw new Error("Código ya fue utilizado");
    this.status = "CLAIMED";
    this.claimedBy = userUid;
    this.claimedAt = new Date().toISOString();
  }

  toJSON() {
    return {
      token_code: this.tokenCode,
      batch_id: this.batchId,
      invoice_folio: this.invoiceFolio,
      points_value: this.pointsValue,
      security_pin: this.securityPin,
      status: this.status,
      claimed_by: this.claimedBy,
      claimed_at: this.claimedAt,
      created_at: this.createdAt
    };
  }
}
