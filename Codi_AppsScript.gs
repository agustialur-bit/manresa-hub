/**
 * Codi per al full de càlcul "Entrenaments".
 *
 * CONFIGURACIÓ PRÈVIA AL SHEET (fer-ho abans de desplegar):
 * 1) Pestanya "Registres" — Fila 1 (capçalera): Data | Concepte | Minuts
 * 2) Pestanya "Conceptes" — un concepte per fila a la columna A (sense capçalera)
 * 3) Pestanya "Feedback" — Fila 1 (capçalera): Data | Jugadora | Cansament | Comentari
 * 4) Pestanya "Videos" — Fila 1 (capçalera): Data | Títol | URL
 *    (vídeos de YouTube dels NOSTRES partits; per afegir-ne un de nou,
 *    només cal afegir-hi una fila més amb la data, un títol curt i l'enllaç)
 * 5) Pestanya "VideosRivals" — mateixes columnes que "Videos", però amb
 *    vídeos de YouTube d'equips CONTRARIS
 *
 * 6) Els INFORMES no van per pestanya: l'script llegeix directament la carpeta
 *    del Drive de CARPETA_INFORMES. Deixa-hi un document i ja surt a l'app.
 *    La primera vegada que es desplega amb aquest codi, Google demana permís
 *    per llegir el Drive: cal acceptar-lo.
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

function readVideos_(sheet) {
  var videos = [];
  if (!sheet) return videos;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) { // salta capçalera
    var row = data[i];
    if (!row[2]) continue; // cal URL com a mínim
    videos.push({ data: formatData_(row[0]), titol: String(row[1] || ''), url: String(row[2]) });
  }
  return videos;
}

// Carpeta del Drive amb els informes de l'equip. Es llegeix tal qual: el nom
// del fitxer es el titol i la data es la de l'ultima modificacio. Aixi no cal
// mantenir cap llista enlloc.
var CARPETA_INFORMES = '1RqXjT3HAUlVuvjX2h-kOLUC90cB0Lxmk';
var ULTIM_ERROR_CARPETA = '';

function readCarpeta_(idCarpeta) {
  var out = [];
  if (!idCarpeta) return out;
  try {
    var fitxers = DriveApp.getFolderById(idCarpeta).getFiles();
    while (fitxers.hasNext()) {
      var f = fitxers.next();
      out.push({
        data: formatData_(f.getLastUpdated()),
        // Fora l'extensio: a l'app ja es veu que es un document
        titol: f.getName().replace(/\.[A-Za-z0-9]{1,5}$/, ''),
        url: f.getUrl()
      });
    }
  } catch (err) {
    // No ens l'empassem en silenci: una llista buida per falta de permis i una
    // carpeta realment buida es veuen igual, i aixo costa d'endevinar.
    ULTIM_ERROR_CARPETA = String(err && err.message || err);
    return [];
  }
  out.sort(function (a, b) { return a.data < b.data ? 1 : (a.data > b.data ? -1 : 0); });
  return out;
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var regSheet = ss.getSheetByName('Registres');
  var concSheet = ss.getSheetByName('Conceptes');
  var fbSheet = ss.getSheetByName('Feedback');
  var vidSheet = ss.getSheetByName('Videos');
  var vidRivalsSheet = ss.getSheetByName('VideosRivals');
  var imgSheet = ss.getSheetByName('Imatges');

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

  var videos = readVideos_(vidSheet);
  var videosRivals = readVideos_(vidRivalsSheet);
  // Mateix format que els videos: Data | Titol | URL. Si la pestanya no
  // existeix, readVideos_ retorna una llista buida i no passa res.
  var imatges = readVideos_(imgSheet);
  var informes = readCarpeta_(CARPETA_INFORMES);

  return ContentService
    .createTextOutput(JSON.stringify({
      registres: registres, conceptes: conceptes, feedback: feedback,
      videos: videos, videosRivals: videosRivals,
      imatges: imatges,
      informes: informes,
      informes_error: ULTIM_ERROR_CARPETA
    }))
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


/**
 * Prova dels informes. Executa-la des de l'editor (botó "Executa") i mira el
 * registre: la PRIMERA vegada Google demanarà permís per llegir el Drive, que
 * és el que necessita readCarpeta_(). Desplegar sol no demana res.
 */
function provaInformes() {
  var r = readCarpeta_(CARPETA_INFORMES);
  Logger.log('Informes trobats: ' + r.length);
  if (ULTIM_ERROR_CARPETA) Logger.log('ERROR: ' + ULTIM_ERROR_CARPETA);
  r.forEach(function (x) { Logger.log(x.data + '  ' + x.titol); });
}
