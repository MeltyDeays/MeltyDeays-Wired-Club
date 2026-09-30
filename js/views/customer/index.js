/**
 * Fachada Agregadora de Subvistas del Portal de Clientes (The Wired Club)
 */
import * as AuthView from "./CustomerAuthView.js";
import * as ClaimView from "./CustomerClaimView.js";
import * as CatalogView from "./CustomerCatalogView.js";
import * as VouchersView from "./CustomerVouchersView.js";

export * from "./CustomerAuthView.js";
export * from "./CustomerClaimView.js";
export * from "./CustomerCatalogView.js";
export * from "./CustomerVouchersView.js";

export function initCustomerViews(deps) {
  AuthView.initCustomerAuthView(deps);
  ClaimView.initCustomerClaimView({
    ...deps,
    openAuthModal: AuthView.openAuthModal
  });
  CatalogView.initCustomerCatalogView({
    ...deps,
    openAuthModal: AuthView.openAuthModal,
    showVoucherModal: VouchersView.showVoucherModal
  });
  VouchersView.initCustomerVouchersView(deps);
}
