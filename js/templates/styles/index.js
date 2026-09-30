/**
 * Fachada Agregadora de Estilos de Facturación
 */
import { getInvoice4x1Styles } from "./invoice4x1Styles.js";
import { get4x1ToolbarStyles } from "./printToolbarStyles.js";
import { getInvoiceSingleStyles } from "./invoiceSingleStyles.js";

export { getInvoice4x1Styles, get4x1ToolbarStyles, getInvoiceSingleStyles };

/**
 * Retorna los estilos completos combinados para la impresión del pliego 4x1
 * @param {object} dims
 * @returns {string}
 */
export function get4x1FullPrintStyles(dims) {
  return get4x1ToolbarStyles(dims) + "\n" + getInvoice4x1Styles(dims);
}

/**
 * Retorna los estilos completos combinados para la factura digital individual
 * @param {object} dims
 * @returns {string}
 */
export function getSingleDigitalFullPrintStyles(dims) {
  return getInvoice4x1Styles(dims) + "\n" + getInvoiceSingleStyles(dims);
}

/**
 * Alias retrocompatible para InvoiceTemplateService.getComponentStyles(dims)
 * @param {object} dims
 * @returns {string}
 */
export function getComponentStyles(dims) {
  return getInvoice4x1Styles(dims);
}
