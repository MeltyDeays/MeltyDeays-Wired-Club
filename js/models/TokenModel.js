/* Model: Token QR de Factura Física 4x1 */
export class TokenModel {
  constructor(data = {}) {
    this.tokenCode = data.tokenCode || data.token_code || "";
    this.batchId = data.batchId || data.batch_id || "";
    this.invoiceFolio = data.invoiceFolio || data.invoice_folio || "";
    this.pointsValue = Number(data.pointsValue !== undefined ? data.pointsValue : (data.points_value !== undefined ? data.points_value : 0));
    this.securityPin = data.securityPin || data.security_pin || "";
    this.status = data.status || (this.pointsValue > 0 ? "ACTIVE" : "PENDING_ASSIGNMENT"); // PENDING_ASSIGNMENT | ACTIVE | CLAIMED
    this.assignedBy = data.assignedBy || data.assigned_by || null;
    this.assignedAt = data.assignedAt || data.assigned_at || null;
    this.claimedBy = data.claimedBy || data.claimed_by || null;
    this.claimedAt = data.claimedAt || data.claimed_at || null;
    this.createdAt = data.createdAt || data.created_at || new Date().toISOString();
  }

  isPendingAssignment() {
    return this.status === "PENDING_ASSIGNMENT" || this.pointsValue <= 0;
  }

  isActive() {
    return this.status === "ACTIVE" && this.pointsValue > 0;
  }

  isClaimed() {
    return this.status === "CLAIMED";
  }

  assignPoints(points, cashierUid = "admin") {
    if (this.isClaimed()) {
      throw new Error("Esta factura ya fue reclamada por un cliente.");
    }
    const pts = Number(points);
    if (isNaN(pts) || pts <= 0) {
      throw new Error("Ingresa una cantidad de puntos válida mayor a 0.");
    }
    this.pointsValue = pts;
    this.status = "ACTIVE";
    this.assignedBy = cashierUid;
    this.assignedAt = new Date().toISOString();
  }

  claim(userUid) {
    if (this.isClaimed()) throw new Error("Código ya fue utilizado.");
    if (this.isPendingAssignment()) {
      throw new Error("Esta factura aún no ha sido activada en caja. Solicita en el mostrador la asignación de tus puntos.");
    }
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
      assigned_by: this.assignedBy,
      assigned_at: this.assignedAt,
      claimed_by: this.claimedBy,
      claimed_at: this.claimedAt,
      created_at: this.createdAt
    };
  }
}
