/**
 * Fachada Agregadora de Subvistas del Panel de Administración (The Wired Club)
 */
import * as CatalogCalcView from "./AdminCatalogCalculatorView.js";
import * as SaleCalcView from "./AdminSalePointsCalculatorView.js";
import * as InvoiceModalView from "./AdminInvoiceModalView.js";
import * as UsersView from "./AdminUsersView.js";
import * as VouchersView from "./AdminVouchersView.js";
import * as PosView from "./AdminPosView.js";
import * as InvoiceBatchView from "./AdminInvoiceBatchView.js";
import * as SandboxDbView from "./AdminSandboxDbView.js";

export * from "./AdminCatalogCalculatorView.js";
export * from "./AdminSalePointsCalculatorView.js";
export * from "./AdminInvoiceModalView.js";
export * from "./AdminUsersView.js";
export * from "./AdminVouchersView.js";
export * from "./AdminPosView.js";
export * from "./AdminInvoiceBatchView.js";
export * from "./AdminSandboxDbView.js";

export function initAdminViews(deps) {
  CatalogCalcView.initAdminCatalogCalculatorView(deps);
  SaleCalcView.initAdminSalePointsCalculatorView({
    ...deps,
    toggleSingleInvoicePointsFields: InvoiceModalView.toggleSingleInvoicePointsFields
  });
  InvoiceModalView.initAdminInvoiceModalView({
    ...deps,
    getSelectedPaperDimensions: InvoiceBatchView.getSelectedPaperDimensions
  });
  UsersView.initAdminUsersView(deps);
  VouchersView.initAdminVouchersView(deps);
  PosView.initAdminPosView({
    ...deps,
    openAdjustPointsModal: UsersView.openAdjustPointsModal,
    openUserLedgerModal: UsersView.openUserLedgerModal
  });
  InvoiceBatchView.initAdminInvoiceBatchView({
    ...deps,
    promptAssignPoints: PosView.promptAssignPoints,
    openSingleDigitalInvoiceModal: InvoiceModalView.openSingleDigitalInvoiceModal
  });
  SandboxDbView.initAdminSandboxDbView({
    ...deps,
    renderTokensTable: deps.renderTokensTable,
    renderAdmin: deps.renderAdmin
  });
}
