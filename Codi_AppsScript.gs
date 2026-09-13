/**
 * Codi per al full de càlcul "Entrenaments".
 *
 * CONFIGURACIÓ PRÈVIA AL SHEET (fer-ho abans de desplegar):
 * 1) Pestanya "Registres" — Fila 1 (capçalera): Data | Concepte | Minuts
 * 2) Pestanya "Conceptes" — un concepte per fila a la columna A (sense capçalera)
 * 3) Pestanya "Feedback" — Fila 1 (capçalera): Data | Jugadora | Cansament | Comentari
 * 4) Pestanya "Videos" — Fila 1 (capçalera): Data | Títol | URL
 *    (un vídeo de YouTube per fila; per afegir-ne un de nou, només cal
 *    afegir-hi una fila més amb la data, un títol curt i l'enllaç)
 *
 * DESPLEGAMENT:
 * Desplegament -> Gestiona desplegaments -> llapis (editar) -> Nova versió -> Desplega
 * (si ja tens l'aplicació web desplegada, no cal tornar a canviar la URL /exec)
 */

function formatData_(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  var asDate = new Date(val);
  return isNaN(asDate) ? String(val || '') : Utilities.formatDate(asDate, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var regSheet = ss.getSheetByName('Registres');
  var concSheet = ss.getSheetByName('Conceptes');
  var fbSheet = ss.getSheetByName('Feedback');
  var vidSheet = ss.getSheetByName('Videos');

  var registres = [];
  if (regSheet) {
    var regData = regSheet.getDataRange().getValues();
    for (var i = 1; i < regData.length; i++) { // salta capçalera
      var row = regData[i];
      if (!row[0]) continue;
      registres.push({ data: formatData_(row[0]), concepte: row[1], minuts: row[2] });
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

  var feedback = [];
  if (fbSheet) {
    var fbData = fbSheet.getDataRange().getValues();
    for (var f = 1; f < fbData.length; f++) { // salta capçalera
      var frow = fbData[f];
      if (!frow[0]) continue;
      feedback.push({
        data: formatData_(frow[0]),
        jugadora: frow[1],
        cansament: frow[2],
        comentari: frow[3] || ''
      });
    }
  }

  var videos = [];
  if (vidSheet) {
    var vidData = vidSheet.getDataRange().getValues();
    for (var k = 1; k < vidData.length; k++) { // salta capçalera
      var vrow = vidData[k];
      if (!vrow[2]) continue; // cal URL com a mínim
      videos.push({ data: formatData_(vrow[0]), titol: String(vrow[1] || ''), url: String(vrow[2]) });
    }
  }

  return ContentService
    .createTextOutput(JSON.stringify({ registres: registres, conceptes: conceptes, feedback: feedback, videos: videos }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var body = JSON.parse(e.postData.contents);

  if (body.type === 'feedback') {
    var fbSheet = ss.getSheetByName('Feedback');
    fbSheet.appendRow([body.data, body.jugadora, body.cansament, body.comentari || '']);
    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  var sheet = ss.getSheetByName('Registres');
  var entries = body.entries || [];
  entries.forEach(function (entry) {
    sheet.appendRow([entry.data, entry.concepte, entry.minuts]);
  });

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
