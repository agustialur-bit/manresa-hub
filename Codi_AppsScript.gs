/**
 * Codi per al full de càlcul "Entrenaments".
 *
 * CONFIGURACIÓ PRÈVIA AL SHEET (fer-ho abans de desplegar):
 * 1) Reanomena la primera pestanya del full a exactament:  Registres
 *    Fila 1 (capçalera): Data | Concepte | Minuts
 * 2) Crea una segona pestanya anomenada exactament:  Conceptes
 *    A la columna A, un concepte per fila (sense capçalera), p. ex.:
 *    TIR
 *    ATAC ZONA
 *    DEFENSA P&R
 *    ... (un per fila)
 *    Per afegir un concepte nou en el futur, només cal afegir-hi una fila més.
 *
 * DESPLEGAMENT:
 * Desplegament -> Nova implementació -> Tipus: Aplicació web
 *   - Executar com: Jo (el teu compte)
 *   - Qui hi té accés: Qualsevol
 * Guarda la URL acabada en /exec i passa-me-la.
 */

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var regSheet = ss.getSheetByName('Registres');
  var concSheet = ss.getSheetByName('Conceptes');

  var registres = [];
  if (regSheet) {
    var regData = regSheet.getDataRange().getValues();
    for (var i = 1; i < regData.length; i++) { // salta capçalera
      var row = regData[i];
      if (!row[0]) continue;
      var dataVal = row[0];
      var dataStr = (dataVal instanceof Date)
        ? Utilities.formatDate(dataVal, Session.getScriptTimeZone(), 'yyyy-MM-dd')
        : String(dataVal);
      registres.push({ data: dataStr, concepte: row[1], minuts: row[2] });
    }
  }

  var conceptes = [];
  if (concSheet) {
    var concData = concSheet.getDataRange().getValues();
    for (var j = 0; j < concData.length; j++) {
      var v = concData[j][0];
      if (v) conceptes.push(String(v));
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ registres: registres, conceptes: conceptes }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Registres');
  var body = JSON.parse(e.postData.contents);
  var entries = body.entries || [];

  entries.forEach(function (entry) {
    sheet.appendRow([entry.data, entry.concepte, entry.minuts]);
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
