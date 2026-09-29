/**
 * Base COPA — API de lectura per al hub de Manresa.
 *
 * Instal·lació:
 *   1. Obre el Google Sheet de la base COPA → Extensions → Apps Script.
 *   2. Enganxa aquest codi a Code.gs i canvia TOKEN per una cadena llarga pròpia.
 *   3. Implementa → Nova implementació → Tipus: Aplicació web
 *        Executa com a: Jo
 *        Qui hi té accés: Qualsevol persona
 *   4. Copia l'URL (acaba en /exec). El hub la cridarà així:
 *        <URL>?token=<TOKEN>&temporada=2026-27&competicio=COPA
 *
 * "Qualsevol persona" vol dir que qui tingui l'URL i el token pot llegir les
 * dades. El token no és seguretat forta (és visible al codi del hub), però
 * evita accessos casuals. L'script NOMÉS llegeix: no pot modificar el full.
 *
 * Resposta:
 *   { generat, taules: { partits: {cols, rows}, equip_partit: {...},
 *                         jugadora_partit: {...}, parella_partit: {...},
 *                         equips: {...} } }
 * Format cols/rows (en lloc d'objectes) per reduir la mida del JSON.
 */

const TOKEN = 'CANVIA-AQUEST-TOKEN';
const PESTANYES = ['partits', 'equip_partit', 'jugadora_partit',
                   'parella_partit', 'equips'];
const ZONA = 'Europe/Madrid';

function doGet(e) {
  const p = (e && e.parameter) || {};
  if (TOKEN && p.token !== TOKEN) {
    return json_({ error: 'no autoritzat' });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const out = { generat: new Date().toISOString(), taules: {} };

  PESTANYES.forEach(function (nom) {
    const sh = ss.getSheetByName(nom);
    if (!sh) return;
    const vals = sh.getDataRange().getValues();
    if (!vals.length) return;

    const cols = vals[0].map(String);
    let rows = vals.slice(1).filter(function (r) {
      return r.some(function (c) { return c !== ''; });
    });

    const iT = cols.indexOf('temporada');
    const iC = cols.indexOf('competicio');
    if (p.temporada && iT >= 0) rows = rows.filter(function (r) { return String(r[iT]) === p.temporada; });
    if (p.competicio && iC >= 0) rows = rows.filter(function (r) { return String(r[iC]) === p.competicio; });

    out.taules[nom] = {
      cols: cols,
      rows: rows.map(function (r) {
        return r.map(function (c) {
          return c instanceof Date ? Utilities.formatDate(c, ZONA, 'yyyy-MM-dd') : c;
        });
      }),
    };
  });

  return json_(out);
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Prova ràpida des de l'editor: Executa → provaLocal i mira el registre. */
function provaLocal() {
  const r = JSON.parse(doGet({ parameter: { token: TOKEN } }).getContent());
  Object.keys(r.taules).forEach(function (t) {
    Logger.log(t + ': ' + r.taules[t].rows.length + ' files');
  });
}
