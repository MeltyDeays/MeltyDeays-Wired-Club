/* Service: Generador de Facturas 4x1 Oficiales y Digitales (Facade MVVM) */
import { Physical4x1Builder } from "../templates/builders/Physical4x1Builder.js";
import { SingleDigitalInvoiceBuilder } from "../templates/builders/SingleDigitalInvoiceBuilder.js";
import { getPhysical4x1Designs, getDigitalExclusiveDesigns } from "../templates/designs/index.js";
import { getComponentStyles } from "../templates/styles/index.js";

export class InvoiceTemplateService {
  /* ========================================================
     BUILDER: FACTURAS FÍSICAS 4X1 (TALONARIO OFICIAL)
     ======================================================== */

  static getInvoiceHtml(folio, id, seriesOrTheme) {
    return Physical4x1Builder.getInvoiceHtml(folio, id, seriesOrTheme);
  }

  static getFullWidthBarcodeSvg(code) {
    return Physical4x1Builder.getFullWidthBarcodeSvg(code);
  }

  static getLainBackCardHtml(idx, token, qrIdx, templateIdx) {
    return Physical4x1Builder.getLainBackCardHtml(idx, token, qrIdx, templateIdx);
  }

  static generatePrintDocument(tokens, paperDims, mode = "both", autoPrint = true) {
    return Physical4x1Builder.generatePrintDocument(tokens, paperDims, mode, autoPrint);
  }

  /* ========================================================
     BUILDER: FACTURA DIGITAL INDIVIDUAL (1 PÁGINA COMPLETA)
     ======================================================== */

  static getSingleDigitalInvoiceHtml(inv) {
    return SingleDigitalInvoiceBuilder.getSingleDigitalInvoiceHtml(inv);
  }

  static getSingleDigitalLainBackCardHtml(inv, selectedTemplateIdx = null) {
    return SingleDigitalInvoiceBuilder.getSingleDigitalLainBackCardHtml(inv, selectedTemplateIdx);
  }

  static generateSingleDigitalInvoiceDocument(invoiceData, paperDims, autoPrint = false, selectedTemplateIdx = null) {
    return SingleDigitalInvoiceBuilder.generateSingleDigitalInvoiceDocument(invoiceData, paperDims, autoPrint, selectedTemplateIdx);
  }

  /* ========================================================
     CATÁLOGOS TEMÁTICOS Y ESTILOS (DELEGACIÓN MODULAR)
     ======================================================== */

  static getPhysical4x1DesignsList() {
    return getPhysical4x1Designs();
  }

  static getDigitalExclusiveDesignsList() {
    return getDigitalExclusiveDesigns();
  }

  static getLain20DesignsList() {
    return getDigitalExclusiveDesigns();
  }

  static getComponentStyles(dims) {
    return getComponentStyles(dims);
  }

  /**
   * Devuelve la lista pública de plantillas Lain disponibles para selector UI
   * @param {string} [type='digital'] - 'digital' | 'physical'
   */
  static getAvailableLainTemplates(type = 'digital') {
    if (type === 'physical') {
      return getPhysical4x1Designs().map((item, idx) => ({
        idx,
        id: idx,
        layer: item.layer,
        series: item.series || (idx < 24 ? 'SERIE 1' : 'SERIE 2'),
        name: item.name || (item.layer + ' · ' + item.title),
        title: item.title,
        sub: item.sub,
        kanji: item.kanji
      }));
    }
    return getDigitalExclusiveDesigns().map((item, idx) => ({
      idx,
      id: item.id != null ? item.id : idx,
      layer: item.layer,
      series: 'DIGITAL EXCLUSIVE',
      name: item.name || (item.layer + ' · ' + item.title),
      title: item.title,
      sub: item.sub,
      kanji: item.kanji
    }));
  }
}
