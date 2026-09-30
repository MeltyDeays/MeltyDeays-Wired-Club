/**
 * Aggregator & Facade para Catálogos de Diseños de Facturación
 */
import { series1Designs } from "./series1Designs.js";
import { series2Designs } from "./series2Designs.js";
import { series3Designs } from "./series3Designs.js";
import { digitalExclusiveDesigns } from "./digitalExclusiveDesigns.js";

export { series1Designs, series2Designs, series3Designs, digitalExclusiveDesigns };

/**
 * Retorna la colección completa de 74 diseños físicos para pliegos 4x1 (Series 1, 2 y 3)
 * @returns {Array<object>}
 */
export function getPhysical4x1Designs() {
  return [...series1Designs, ...series2Designs, ...series3Designs];
}

/**
 * Retorna la colección de 20 diseños exclusivos para factura digital individual (1 página)
 * @returns {Array<object>}
 */
export function getDigitalExclusiveDesigns() {
  return digitalExclusiveDesigns;
}
