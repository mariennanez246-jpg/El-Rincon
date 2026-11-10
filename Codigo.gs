/**
 * EL RINCÓN DE RINCÓN — servidor (Google Apps Script)
 * Los datos viven en esta hoja de cálculo. Personas con PIN, registro de cambios (pestaña Auditoria)
 * y recuperación de la cuenta Admin por correo.
 * Después de pegar este código: ejecuta una vez "instalar" y luego "autorizarCorreo" (botón Ejecutar) y acepta los permisos.
 */

const NEGOCIO = 'El Rincón de Rincón';
const COLOR_ENC = '#1F5C2E';

const HOJAS = {
  'Léeme': ['El Rincón de Rincón'],
  'Ventas': ['ID', 'Fecha', 'Cliente', 'Productos', 'Total', 'Pagado', 'Debe', 'Nota', 'Datos'],
  'Compras': ['ID', 'Fecha', 'Producto o insumo', 'Cantidad', 'Unidad', 'Costo total', 'Pagado con', 'Proveedor', 'Datos'],
  'Gastos': ['ID', 'Fecha', 'Descripción', 'Categoría', 'Valor', 'Pagado con', 'Datos'],
  'Producción': ['ID', 'Fecha', 'Producto', 'Cantidad', 'Receta', 'Nota', 'Datos'],
  'Salidas': ['ID', 'Fecha', 'Producto', 'Cantidad', 'Motivo', 'Nota', 'Datos'],
  'Ordeño': ['ID', 'Fecha', 'Litros', 'Nota', 'Datos'],
  'Préstamos': ['ID', 'Fecha', 'Quién', 'Monto', 'Sale de', 'Motivo', 'Devuelto', 'Pendiente', 'Datos'],
  'Traslados': ['ID', 'Fecha', 'De', 'A', 'Monto', 'Nota', 'Datos'],
  'Conteos de caja': ['ID', 'Fecha', 'Mes', 'Resumen', 'Datos'],
  'Recetario': ['ID', 'Nombre', 'Datos'],
  'Cierres del día': ['ID', 'Fecha', 'Contado', 'Esperado', 'Datos'],
  'Cierres del mes': ['ID', 'Mes', 'Datos'],
  'Solicitudes': ['ID', 'Fecha', 'Quién', 'Pedido', 'Estado', 'Datos'],
  'Cierres del local': ['ID', 'Fecha', 'Quién', 'Contado', 'Estado', 'Datos'],
  'Entregas al local': ['ID', 'Fecha', 'Producto', 'Cantidad', 'Datos'],
  'Novedades': ['ID', 'Fecha', 'Quién', 'Novedad', 'Datos'],
  'Ajustes del local': ['ID', 'Fecha', 'Quién', 'Motivo', 'Datos'],
  'Conteos de inventario': ['ID', 'Fecha', 'Producto', 'Sistema', 'Contado', 'Diferencia', 'Datos'],
  'Animales': ['ID', 'Nombre', 'Tipo', 'Sexo', 'Estado', 'Nacimiento', 'Datos'],
  'Historial animales': ['ID', 'Fecha', 'Animal', 'Evento', 'Detalle', 'Datos'],
  'Facturas': ['ID', 'Fecha', 'Proveedor', 'Valor', 'Nota', 'Archivos', 'Datos'],
  'Items': ['ID', 'Nombre', 'Emoji', 'Tipo', 'Unidad', 'Datos'],
  'Config': ['Clave', 'Valor']
};

function sumaPagos_(o) { return (o.pagos || []).reduce(function (s, p) { return s + num_(p.valor); }, 0); }
function sumaDevs_(o) { return (o.devs || []).reduce(function (s, p) { return s + num_(p.monto); }, 0); }

const TIPOS = {
  ventas: { hoja: 'Ventas', pre: 've', fila: function (o) {
    const p = sumaPagos_(o);
    return [o.id, txt_(o.fecha), o.cliente || '', (o.lineas || []).map(function (l) { return l.cant + ' ' + l.nombre; }).join(', '), num_(o.total), p, num_(o.total) - p, o.nota || ''];
  } },
  compras: { hoja: 'Compras', pre: 'co', fila: function (o) {
    return [o.id, txt_(o.fecha), o.nombre || '', num_(o.cant), o.unidad || '', num_(o.costo), o.medio || '', o.proveedor || ''];
  } },
  gastos: { hoja: 'Gastos', pre: 'ga', fila: function (o) {
    return [o.id, txt_(o.fecha), o.desc || '', o.cat || '', num_(o.valor), o.medio || ''];
  } },
  produccion: { hoja: 'Producción', pre: 'pr', fila: function (o) {
    return [o.id, txt_(o.fecha), o.nombre || '', num_(o.cant), o.receta || '', o.nota || ''];
  } },
  salidas: { hoja: 'Salidas', pre: 'sa', fila: function (o) {
    return [o.id, txt_(o.fecha), o.nombre || '', num_(o.cant), o.motivoTxt || o.motivo || '', o.nota || ''];
  } },
  ordeno: { hoja: 'Ordeño', pre: 'or', fila: function (o) {
    return [o.id, txt_(o.fecha), num_(o.litros), o.nota || ''];
  } },
  prestamos: { hoja: 'Préstamos', pre: 'pe', fila: function (o) {
    const d = sumaDevs_(o);
    return [o.id, txt_(o.fecha), o.quien || '', num_(o.monto), o.medio || '', o.motivo || '', d, num_(o.monto) - d];
  } },
  traslados: { hoja: 'Traslados', pre: 'tr', fila: function (o) {
    return [o.id, txt_(o.fecha), o.de || '', o.a || '', num_(o.monto), o.nota || ''];
  } },
  conteosCaja: { hoja: 'Conteos de caja', pre: 'cc', fila: function (o) {
    return [o.id, txt_(o.fecha), txt_(o.mes), (o.filas || []).map(function (f) { return f.nombre + ': contado ' + num_(f.contado) + ' / esperado ' + num_(f.esperado); }).join(' | ')];
  } },
  animales: { hoja: 'Animales', pre: 'an', fila: function (o) {
    return [o.id, o.nombre || '', o.tipo || '', o.sexo || '', o.estado || '', txt_(o.nacimiento || '')];
  } },
  eventosAnimal: { hoja: 'Historial animales', pre: 'ev', fila: function (o) {
    return [o.id, txt_(o.fecha), o.animalNombre || '', o.tipo || '', o.detalle || ''];
  } },
  facturas: { hoja: 'Facturas', pre: 'fa', fila: function (o) {
    return [o.id, txt_(o.fecha), o.proveedor || '', num_(o.valor), o.nota || '', (o.adj || []).map(function (a) { return a.url; }).join(' ')];
  } },
  recetario: { hoja: 'Recetario', pre: 'rc', fila: function (o) { return [o.id, o.nombre || '']; } },
  cierresDia: { hoja: 'Cierres del día', pre: 'cd', fila: function (o) { return [o.id, txt_(o.fecha), num_(o.contado), num_(o.esperado)]; } },
  cierresMes: { hoja: 'Cierres del mes', pre: 'cm', fila: function (o) { return [o.id, txt_(o.mes || o.fecha)]; } },
  solicitudes: { hoja: 'Solicitudes', pre: 'so', fila: function (o) { return [o.id, txt_(o.fecha), o.por || '', o.texto || '', o.estado || '']; } },
  cierresLocal: { hoja: 'Cierres del local', pre: 'cl', fila: function (o) { return [o.id, txt_(o.fecha), o.por || '', num_(o.contado), o.estado || '']; } },
  entregasLocal: { hoja: 'Entregas al local', pre: 'el', fila: function (o) { return [o.id, txt_(o.fecha), o.nombre || '', num_(o.cant)]; } },
  ajustesLocal: { hoja: 'Ajustes del local', pre: 'aj', fila: function (o) { return [o.id, txt_(o.fecha), o.por || '', o.motivo || '']; } },
  novedades: { hoja: 'Novedades', pre: 'nv', fila: function (o) { return [o.id, txt_(o.fecha), o.por || '', o.texto || '']; } },
  conteosInv: { hoja: 'Conteos de inventario', pre: 'ci', fila: function (o) {
    return [o.id, txt_(o.fecha), o.nombre || '', num_(o.sistema), num_(o.contado), num_(o.contado) - num_(o.sistema)];
  } }
};

const LEEME = [
  ['El Rincón de Rincón — La vida en el campo'],
  ['Esta hoja es la base de datos de la página web. Se actualiza sola.'],
  ['Solo MIRA estas pestañas (no las edites a mano): la columna "Datos" es la que usa la página y si la cambias se daña el registro.'],
  ['Los productos, recetas y precios se cambian desde la página (menú Productos).'],
  ['Copias: cada lunes se guarda sola una copia en la carpeta "Respaldos El Rincón de Rincón" de tu Drive. También puedes hacerla desde la página (Ajustes).'],
  ['Si algo se daña: Archivo > Historial de versiones te deja volver a cualquier momento anterior.']
];

/* ---------- página ---------- */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('El Rincón de Rincón')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/* ---------- API para la app móvil (GitHub Pages) ---------- */
function apiPermitidas_() {
  return {
    estado: estado, crearClave: crearClave, configurarAdmin: configurarAdmin, entrar: entrar, cambiarMiClave: cambiarMiClave,
    usuarios: usuarios, guardarUsuario: guardarUsuario, borrarUsuario: borrarUsuario,
    pedirCodigoAdmin: pedirCodigoAdmin, restablecerAdmin: restablecerAdmin, auditoria: auditoria,
    version: version, todo: todo, guardar: guardar, guardarVarios: guardarVarios, borrar: borrar,
    guardarItems: guardarItems, guardarConfig: guardarConfig, respaldarAhora: respaldarAhora, urlHoja: urlHoja,
    subirArchivo: subirArchivo, ponerModoLibre: ponerModoLibre, activarClaves: activarClaves
  };
}
function doPost(e) {
  let out;
  try {
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const fns = apiPermitidas_();
    if (!Object.prototype.hasOwnProperty.call(fns, req.fn)) throw new Error('Función no permitida');
    out = { ok: true, val: fns[req.fn].apply(null, req.args || []) };
  } catch (err) {
    out = { ok: false, err: String((err && err.message) || err) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

/* ---------- utilidades ---------- */
function ss_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function hoja_(n) { return ss_().getSheetByName(n); }
function props_() { return PropertiesService.getScriptProperties(); }
function norm_(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim(); }
function txt_(v) { return "'" + String(v == null ? '' : v); }
function sinComilla_(v) { return String(v == null ? '' : v).replace(/^'/, ''); }
function num_(v) { const n = Number(v); return isNaN(n) ? 0 : n; }
function uuid_(p) { return p + '-' + Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function conCandado_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try { return fn(); } finally { lock.releaseLock(); }
}
function version_() { return Number(props_().getProperty('version') || '1'); }
function subirVersion_() { const v = version_() + 1; props_().setProperty('version', String(v)); return v; }
function buscarFila_(sh, id) {
  if (sh.getLastRow() < 2) return 0;
  const c = sh.getRange(2, 1, sh.getLastRow() - 1, 1).createTextFinder(String(id)).matchEntireCell(true).findNext();
  return c ? c.getRow() : 0;
}
function filas_(n) {
  const sh = hoja_(n);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, HOJAS[n].length).getValues();
}
function reescribir_(n, rows) {
  const sh = hoja_(n), w = HOJAS[n].length;
  sh.getRange(1, 1, 1, w).setValues([HOJAS[n]]);
  if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getMaxColumns()).clearContent();
  if (rows.length) {
    if (sh.getMaxRows() < rows.length + 1) sh.insertRowsAfter(sh.getMaxRows(), rows.length + 1 - sh.getMaxRows());
    sh.getRange(2, 1, rows.length, w).setValues(rows);
  }
}

/* ---------- instalación ---------- */
function instalar() { asegurar_(); return 'Listo'; }
const ESTRUCTURA = '5';
function asegurar_() {
  if (props_().getProperty('instalado') === '1' && props_().getProperty('estructura') === ESTRUCTURA) return;
  conCandado_(function () {
    if (props_().getProperty('instalado') === '1' && props_().getProperty('estructura') === ESTRUCTURA) return;
    const ss = ss_();
    Object.keys(HOJAS).forEach(function (n) {
      let sh = ss.getSheetByName(n);
      if (sh) return;
      sh = ss.insertSheet(n);
      if (n === 'Léeme') { sh.clear(); sh.getRange(1, 1, LEEME.length, 1).setValues(LEEME); sh.getRange('A1').setFontSize(16).setFontWeight('bold'); sh.setColumnWidth(1, 900); return; }
      const h = HOJAS[n];
      sh.getRange(1, 1, 1, h.length).setValues([h]).setFontWeight('bold').setBackground(COLOR_ENC).setFontColor('#FFFFFF');
      sh.setFrozenRows(1);
    });
    const def = ss.getSheetByName('Hoja 1') || ss.getSheetByName('Sheet1') || ss.getSheetByName('Hoja1');
    if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
    if (!filas_('Items').length && !props_().getProperty('sembrado')) sembrar_();
    if (!ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'respaldoSemanal'; })) {
      ScriptApp.newTrigger('respaldoSemanal').timeBased().onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(4).create();
    }
    if (!props_().getProperty('secreto')) props_().setProperty('secreto', Utilities.getUuid() + Utilities.getUuid());
    props_().setProperty('instalado', '1');
    props_().setProperty('estructura', ESTRUCTURA);
  });
}
function sembrar_() {
  guardarItems_(SEMILLA.items);
  guardarCfg_(SEMILLA.cfg);
  props_().setProperty('sembrado', '1');
}

/* ---------- catálogo y ajustes ---------- */
function leerItems_() {
  const w = HOJAS['Items'].length;
  return filas_('Items').map(function (r) { try { return JSON.parse(r[w - 1]); } catch (e) { return null; } }).filter(Boolean);
}
function guardarItems_(items) {
  const rows = items.map(function (it) {
    if (!it.id) it.id = uuid_('it');
    return [it.id, it.nombre || '', it.emoji || '', it.tipo || '', it.unidad || '', JSON.stringify(it)];
  });
  reescribir_('Items', rows);
}
function leerCfg_() {
  const f = filas_('Config').filter(function (r) { return r[0] === 'cfg'; })[0];
  if (!f) return SEMILLA.cfg;
  try { return JSON.parse(f[1]); } catch (e) { return SEMILLA.cfg; }
}
function guardarCfg_(cfg) { reescribir_('Config', [['cfg', JSON.stringify(cfg)]]); }

function guardarItems(token, json) {
  const u = permiso_(token, 'supervisor');
  const items = JSON.parse(json);
  if (!Array.isArray(items)) throw new Error('Lista de productos no válida.');
  return conCandado_(function () {
    const antes = leerItems_().map(function (x) { return x.nombre; }).join(', ');
    guardarItems_(items);
    auditar_(u, 'Editó productos y recetas', '', 'Items', antes, items.map(function (x) { return x.nombre; }).join(', '));
    return subirVersion_();
  });
}
function guardarConfig(token, json) {
  const u = permiso_(token, 'supervisor');
  const cfg = JSON.parse(json);
  return conCandado_(function () {
    const antes = leerCfg_();
    guardarCfg_(cfg);
    auditar_(u, 'Cambió los ajustes', '', 'Config', antes, cfg);
    return subirVersion_();
  });
}

/* ---------- registros ---------- */
function leerTipo_(tipo) {
  const t = TIPOS[tipo], w = HOJAS[t.hoja].length;
  return filas_(t.hoja).map(function (r) { try { return JSON.parse(r[w - 1]); } catch (e) { return null; } }).filter(Boolean);
}
function version(token) { validar_(token); return version_(); }
function todo(token) {
  const u = validar_(token);
  const out = { version: version_(), yo: publico_(u), cfg: leerCfg_(), items: leerItems_(), reg: {} };
  const ver = PERM_ROL[u.rol] ? { trabajador: ['ordeno', 'animales', 'eventosAnimal', 'novedades', 'solicitudes', 'recetario'], local: ['ventas', 'cierresLocal', 'entregasLocal', 'novedades', 'solicitudes', 'ajustesLocal', 'recetario'] }[u.rol] : null;
  if (ver) { delete out.cfg.contaHash; delete out.cfg.contaRec; }
  Object.keys(TIPOS).forEach(function (k) {
    if (ver && ver.indexOf(k) < 0) { out.reg[k] = []; return; }
    let l = leerTipo_(k);
    if (ver && k === 'ventas') l = l.filter(function (x) { return x.lugar === 'local'; });
    if (ver && (k === 'solicitudes' || k === 'cierresLocal' || k === 'novedades' || k === 'ajustesLocal')) l = l.filter(function (x) { return x.por === u.nombre; });
    out.reg[k] = l;
  });
  return JSON.stringify(out);
}
function escribirReg_(u, tipo, o, sh, filasPorId) {
  const t = TIPOS[tipo];
  const nuevo = !o.id;
  if (nuevo) o.id = uuid_(t.pre);
  if (!o.ts) o.ts = Date.now();
  o.act = Date.now();
  o.por = o.por || u.nombre;
  const fila = t.fila(o).concat([JSON.stringify(o)]);
  const r = filasPorId ? (filasPorId[o.id] || 0) : buscarFila_(sh, o.id);
  if (r) {
    if (esBasico_(u)) throw new Error('PERMISO: tu perfil (' + (ROL_TXT[u.rol] || u.rol) + ') solo puede registrar cosas nuevas. Para corregir algo, pide la corrección y Nataly la autoriza.');
    const antes = sh.getRange(r, fila.length).getValue();
    sh.getRange(r, 1, 1, fila.length).setValues([fila]);
    return { nuevo: false, antes: antes };
  }
  sh.getRange(sh.getLastRow() + 1, 1, 1, fila.length).setValues([fila]);
  return { nuevo: true, antes: null };
}
function resumen_(tipo, o) {
  if (tipo === 'ventas') return 'Venta $' + num_(o.total) + (o.cliente ? ' a ' + o.cliente : '');
  if (tipo === 'compras') return 'Compra: ' + (o.nombre || '') + ' ' + o.cant + ' $' + num_(o.costo);
  if (tipo === 'gastos') return 'Gasto: ' + (o.desc || '') + ' $' + num_(o.valor);
  if (tipo === 'produccion') return 'Producción: ' + (o.nombre || '') + ' ' + o.cant;
  if (tipo === 'salidas') return 'Salida: ' + (o.nombre || '') + ' ' + o.cant + ' (' + (o.motivoTxt || o.motivo || '') + ')';
  if (tipo === 'ordeno') return 'Ordeño: ' + o.litros + ' L';
  if (tipo === 'prestamos') return 'Préstamo de ' + (o.quien || '') + ' $' + num_(o.monto);
  if (tipo === 'traslados') return 'Traslado $' + num_(o.monto) + ' de ' + (o.de || '') + ' a ' + (o.a || '');
  if (tipo === 'conteosCaja') return 'Conteo de caja ' + (o.mes || '');
  if (tipo === 'conteosInv') return 'Conteo de inventario: ' + (o.nombre || '');
  if (tipo === 'animales') return 'Animal: ' + (o.nombre || '') + ' (' + (o.estado || '') + ')';
  if (tipo === 'eventosAnimal') return 'Historial de ' + (o.animalNombre || '') + ': ' + (o.tipo || '') + ' ' + (o.detalle || '');
  if (tipo === 'facturas') return 'Factura: ' + (o.proveedor || '') + ' $' + num_(o.valor);
  return tipo;
}
function guardar(token, tipo, json) {
  const u = validar_(token);
  if (!TIPOS[tipo]) throw new Error('Tipo de registro no válido.');
  const o = JSON.parse(json);
  if (PERM_ROL[u.rol] && PERM_ROL[u.rol].indexOf(tipo) < 0) throw new Error('PERMISO: tu perfil (' + ROL_TXT[u.rol] + ') no puede registrar eso.');
  if (PERM_ROL[u.rol]) {
    const sols = (tipo === 'ventas' || tipo === 'ajustesLocal') ? leerTipo_('solicitudes') : [];
    const fechaOk = o.fecha && o.fecha !== hoyBog_() && sols.some(function (x) { return x.tipo === 'reabrir' && x.estado === 'aprobada' && x.por === u.nombre && x.fecha === o.fecha; });
    if (tipo !== 'eventosAnimal' && !(tipo === 'ventas' && fechaOk)) o.fecha = hoyBog_();
    if (tipo === 'eventosAnimal' && !o.fecha) o.fecha = hoyBog_();
    if (tipo === 'ventas') o.lugar = 'local';
    if (tipo === 'ajustesLocal') {
      const ok = sols.filter(function (x) { return x.id === o.solId && x.tipo === 'inventario' && x.estado === 'aprobada' && x.por === u.nombre; })[0];
      if (!ok) throw new Error('PERMISO: primero pide la autorización para contar o ajustar el inventario.');
      if (leerTipo_('ajustesLocal').some(function (x) { return x.solId === o.solId; })) throw new Error('PERMISO: esa autorización ya se usó. Pide otra.');
      o.por = u.nombre;
    }
    if (tipo === 'cierresLocal' || tipo === 'solicitudes') { o.estado = 'pendiente'; o.resp = ''; }
  }
  return conCandado_(function () {
    const sh = hoja_(TIPOS[tipo].hoja);
    const r = escribirReg_(u, tipo, o, sh, null);
    auditar_(u, r.nuevo ? 'Registró' : 'Editó', o.fecha || '', resumen_(tipo, o), r.antes, JSON.stringify(o));
    return JSON.stringify({ version: subirVersion_(), reg: o });
  });
}
function guardarVarios(token, tipo, json) {
  const u = permiso_(token, 'supervisor');
  if (!TIPOS[tipo]) throw new Error('Tipo de registro no válido.');
  const lista = JSON.parse(json);
  if (!Array.isArray(lista)) throw new Error('Lista no válida.');
  return conCandado_(function () {
    const sh = hoja_(TIPOS[tipo].hoja), t = TIPOS[tipo];
    const ids = {};
    if (sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().forEach(function (r, i) { ids[String(r[0])] = i + 2; });
    const nuevas = [];
    lista.forEach(function (o) {
      if (o.id && ids[o.id]) { escribirReg_(u, tipo, o, sh, ids); return; }
      if (!o.id) o.id = uuid_(t.pre);
      if (!o.ts) o.ts = Date.now();
      o.act = Date.now(); o.por = o.por || u.nombre;
      nuevas.push(t.fila(o).concat([JSON.stringify(o)]));
    });
    if (nuevas.length) sh.getRange(sh.getLastRow() + 1, 1, nuevas.length, nuevas[0].length).setValues(nuevas);
    auditar_(u, 'Cargó ' + lista.length + ' registros', '', t.hoja, null, null);
    return subirVersion_();
  });
}
function borrar(token, tipo, id) {
  const u = permiso_(token, 'supervisor');
  if (!TIPOS[tipo]) throw new Error('Tipo de registro no válido.');
  return conCandado_(function () {
    const sh = hoja_(TIPOS[tipo].hoja), r = buscarFila_(sh, id);
    if (r) {
      const w = HOJAS[TIPOS[tipo].hoja].length;
      const antes = sh.getRange(r, w).getValue();
      sh.deleteRow(r);
      let o = null; try { o = JSON.parse(antes); } catch (e) { }
      auditar_(u, 'Borró', o && o.fecha || '', o ? resumen_(tipo, o) : tipo, antes, null);
    }
    return subirVersion_();
  });
}

/* ---------- personas, roles y acceso ---------- */
const NIVEL = { empleado: 1, trabajador: 1, local: 1, supervisor: 2, admin: 3 };
const ROL_TXT = { admin: 'Admin', supervisor: 'Supervisor', empleado: 'Empleado', trabajador: 'Trabajador de la finca', local: 'Encargado del local' };
const PERM_ROL = { trabajador: ['ordeno', 'eventosAnimal', 'novedades', 'solicitudes'], local: ['ventas', 'cierresLocal', 'novedades', 'solicitudes', 'ajustesLocal'] };
function esBasico_(u) { return u.rol === 'empleado' || u.rol === 'trabajador' || u.rol === 'local'; }
function hoyBog_() { return Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd'); }
function hash_(clave, sal) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, sal + '|' + clave, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function usuarios_() {
  const raw = props_().getProperty('usuarios');
  if (raw) return JSON.parse(raw);
  props_().setProperty('usuarios', '[]');
  return [];
}
function guardarUsuarios_(l) { props_().setProperty('usuarios', JSON.stringify(l)); }
function publico_(u) { return { id: u.id, nombre: u.nombre, rol: u.rol, tipo: u.tipo || 'pin' }; }
function adminDe_(l) { return (l || usuarios_()).filter(function (u) { return u.rol === 'admin' && u.activo !== false; })[0] || null; }
function buscarPersona_(l, quien) {
  const q = norm_(quien);
  return l.filter(function (u) { return u.activo !== false && (u.id === quien || norm_(u.nombre) === q); })[0] || null;
}
function firma_(texto, u) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(texto), props_().getProperty('secreto') + '|' + u.hash));
}
function token_(u, recordar) {
  const horas = esBasico_(u) ? (recordar ? 180 * 24 : 24) : (recordar ? 30 * 24 : 12);
  const exp = Date.now() + horas * 3600 * 1000;
  return exp + '.' + u.id + '.' + firma_(exp + '.' + u.id, u);
}
function libre_() { return props_().getProperty('libre') !== '0'; }
function validar_(token) {
  asegurar_();
  if (String(token || '').indexOf('libre.') === 0) {
    if (!libre_()) throw new Error('AUTH');
    const nombre = String(token).slice(6).replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñÜü ]/g, '').trim().slice(0, 30) || 'Nataly';
    return { id: 'libre', nombre: nombre, rol: 'admin', tipo: 'libre', activo: true };
  }
  const p = String(token || '').split('.');
  if (p.length !== 3 || Number(p[0]) < Date.now()) throw new Error('AUTH');
  const u = usuarios_().filter(function (x) { return x.id === p[1] && x.activo !== false; })[0];
  if (!u || firma_(p[0] + '.' + p[1], u) !== p[2]) throw new Error('AUTH');
  return u;
}
function permiso_(token, minimo) {
  const u = validar_(token);
  if ((NIVEL[u.rol] || 0) < NIVEL[minimo]) throw new Error('PERMISO: tu perfil (' + (ROL_TXT[u.rol] || u.rol) + ') no puede hacer esto. Pídeselo a ' + (minimo === 'admin' ? 'Admin.' : 'un supervisor o Admin.'));
  return u;
}
function claveValida_(tipo, clave, rol) {
  const c = String(clave || '');
  if (tipo === 'pin') { if (!/^[0-9]{4,8}$/.test(c)) throw new Error('El PIN debe tener de 4 a 8 números.'); return; }
  if (c.length < (rol === 'admin' ? 6 : 4)) throw new Error('La clave debe tener al menos ' + (rol === 'admin' ? 6 : 4) + ' caracteres.');
}
function ponerClave_(u, clave) { u.sal = Utilities.getUuid(); u.hash = hash_(clave, u.sal); u.cambio = Date.now(); }

function estado() {
  asegurar_();
  const l = usuarios_(), a = adminDe_(l);
  const personas = l.filter(function (u) { return u.activo !== false; }).map(publico_)
    .sort(function (x, y) { return (NIVEL[y.rol] - NIVEL[x.rol]) || String(x.nombre).localeCompare(String(y.nombre), 'es'); });
  return { libre: libre_(), personasLibres: leerCfg_().personas || ['Nataly', 'Jefferson'], tieneClave: l.length > 0, adminListo: !!a, adminConCorreo: !!(a && a.correo), personas: personas, usuario: personas.length ? personas[0].nombre : '', negocio: NEGOCIO };
}
function crearClave(usuario, clave, recordar, correo) {
  asegurar_();
  return conCandado_(function () {
    const l = usuarios_();
    if (l.length) throw new Error('Ya existen cuentas. Entra con la tuya.');
    claveValida_('clave', clave, 'admin');
    if (correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(correo).trim())) throw new Error('Escribe un correo válido (sirve para recuperar la cuenta).');
    const nombre = String(usuario || '').trim().replace(/\s+/g, ' ') || 'Admin';
    const a = { id: 'u-admin', nombre: nombre, rol: 'admin', tipo: 'clave', correo: String(correo || '').trim(), activo: true, creado: Date.now() };
    ponerClave_(a, clave); l.push(a); guardarUsuarios_(l);
    auditar_(a, 'Creó la cuenta Admin', '', '', null, null);
    return token_(a, recordar);
  });
}
function activarClaves(token, json) {
  permiso_(token, 'admin');
  const d = JSON.parse(json);
  return conCandado_(function () {
    if (usuarios_().length) throw new Error('Ya hay cuentas creadas. Usa Ajustes > Personas para agregar más.');
    const a0 = d.admin || {};
    claveValida_('clave', a0.clave, 'admin');
    if (a0.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(a0.correo).trim())) throw new Error('Escribe un correo válido.');
    const l = [];
    const a = { id: 'u-admin', nombre: String(a0.nombre || 'Nataly').trim() || 'Nataly', rol: 'admin', tipo: 'clave', correo: String(a0.correo || '').trim(), activo: true, creado: Date.now() };
    ponerClave_(a, a0.clave); l.push(a);
    (d.personas || []).forEach(function (p) {
      const nombre = String(p.nombre || '').trim().replace(/\s+/g, ' ');
      if (!nombre) return;
      if (l.some(function (x) { return norm_(x.nombre) === norm_(nombre); })) throw new Error('Hay dos personas con el nombre ' + nombre + '.');
      const u = { id: uuid_('u'), nombre: nombre, rol: ['supervisor', 'empleado', 'trabajador', 'local'].indexOf(p.rol) >= 0 ? p.rol : 'supervisor', tipo: 'pin', activo: true, creado: Date.now() };
      claveValida_('pin', p.clave, u.rol); ponerClave_(u, p.clave); l.push(u);
    });
    guardarUsuarios_(l);
    props_().setProperty('libre', '0');
    auditar_(a, 'Activó las contraseñas para cada persona', '', l.length + ' cuentas', null, null);
    return token_(a, true);
  });
}
function ponerModoLibre(token, si) {
  const u = permiso_(token, 'admin');
  if (!si && !usuarios_().length) throw new Error('Primero crea las cuentas con PIN (cierra sesión y crea la cuenta Admin) antes de pedir PIN.');
  props_().setProperty('libre', si ? '1' : '0');
  auditar_(u, si ? 'Quitó el PIN (entrada libre)' : 'Volvió a pedir PIN', '', '', null, null);
  return si ? 'libre' : 'pin';
}
function subirArchivo(token, nombre, mime, base64) {
  const u = validar_(token);
  if (!base64 || String(base64).length > 9000000) throw new Error('El archivo es muy pesado (máximo 6 MB). Toma la foto con menos calidad.');
  const it = DriveApp.getFoldersByName('Facturas y documentos El Rincón de Rincón');
  const carpeta = it.hasNext() ? it.next() : DriveApp.createFolder('Facturas y documentos El Rincón de Rincón');
  const blob = Utilities.newBlob(Utilities.base64Decode(base64), String(mime || 'application/octet-stream'), String(nombre || 'archivo').slice(0, 80));
  const f = carpeta.createFile(blob);
  f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  auditar_(u, 'Subió un archivo', '', String(nombre || ''), null, null);
  return JSON.stringify({ id: f.getId(), url: f.getUrl(), nombre: String(nombre || 'archivo').slice(0, 80), mime: String(mime || '') });
}
function configurarAdmin() { throw new Error('No hace falta: esta caja es nueva.'); }
function entrar(quien, clave, recordar) {
  asegurar_();
  const l = usuarios_();
  if (!l.length) throw new Error('SINCLAVE');
  const u = buscarPersona_(l, quien);
  Utilities.sleep(350);
  if (!u) throw new Error('Esa persona no existe o está desactivada.');
  const kf = 'fallos_' + u.id, f = JSON.parse(props_().getProperty(kf) || '{"n":0,"hasta":0}');
  if (f.hasta > Date.now()) throw new Error('Demasiados intentos. Espera ' + Math.ceil((f.hasta - Date.now()) / 60000) + ' min o pide a Admin que te cambie el PIN.');
  if (hash_(clave, u.sal) !== u.hash) {
    f.n++; if (f.n >= 5) { f.hasta = Date.now() + 10 * 60000; f.n = 0; }
    props_().setProperty(kf, JSON.stringify(f));
    throw new Error(u.tipo === 'pin' ? 'PIN incorrecto.' : 'Clave incorrecta.');
  }
  props_().deleteProperty(kf);
  auditar_(u, 'Entró a la caja', '', '', null, null);
  return token_(u, recordar);
}
function cambiarMiClave(token, actual, nueva) {
  const u = validar_(token);
  return conCandado_(function () {
    const l = usuarios_(), me = l.filter(function (x) { return x.id === u.id; })[0];
    if (hash_(actual, me.sal) !== me.hash) throw new Error((me.tipo === 'pin' ? 'El PIN' : 'La clave') + ' actual no es correcto.');
    claveValida_(me.tipo || 'pin', nueva, me.rol);
    ponerClave_(me, nueva); guardarUsuarios_(l);
    auditar_(me, 'Cambió su ' + (me.tipo === 'pin' ? 'PIN' : 'clave'), '', '', null, null);
    return token_(me, false);
  });
}

function usuarios(token) {
  permiso_(token, 'admin');
  return usuarios_().map(function (u) { const o = publico_(u); o.activo = u.activo !== false; o.correo = u.rol === 'admin' ? (u.correo || '') : undefined; o.creado = u.creado || 0; o.cambio = u.cambio || 0; return o; });
}
function guardarUsuario(token, json) {
  const yo = permiso_(token, 'admin');
  const d = JSON.parse(json);
  return conCandado_(function () {
    const l = usuarios_();
    let u = d.id ? l.filter(function (x) { return x.id === d.id; })[0] : null;
    const nuevo = !u;
    const nombre = String(d.nombre || '').trim().replace(/\s+/g, ' ');
    if (!nombre) throw new Error('Escribe el nombre.');
    if (l.some(function (x) { return x.id !== (u && u.id) && norm_(x.nombre) === norm_(nombre); })) throw new Error('Ya hay una persona llamada ' + nombre + '.');
    const antes = u ? publico_(u) : null;
    if (nuevo) {
      if (d.rol === 'admin') throw new Error('Solo puede haber una cuenta Admin.');
      u = { id: uuid_('u'), activo: true, creado: Date.now() };
      l.push(u);
    }
    u.nombre = nombre;
    if (u.rol === 'admin') {
      if (d.activo === false) throw new Error('La cuenta Admin no se puede desactivar.');
      if (d.correo != null) { const c = String(d.correo).trim(); if (c && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c)) throw new Error('Correo no válido.'); u.correo = c; }
    } else {
      u.rol = ['empleado', 'trabajador', 'local'].indexOf(d.rol) >= 0 ? d.rol : 'supervisor';
      u.activo = d.activo !== false;
      u.tipo = d.tipo === 'clave' ? 'clave' : 'pin';
    }
    if (d.clave) { claveValida_(u.tipo || 'pin', d.clave, u.rol); ponerClave_(u, d.clave); props_().deleteProperty('fallos_' + u.id); }
    else if (nuevo || !u.hash) throw new Error('Ponle un PIN para que pueda entrar.');
    guardarUsuarios_(l);
    const acc = nuevo ? 'Creó a ' + u.nombre : 'Editó a ' + u.nombre + (d.clave ? ' (cambió su PIN o clave)' : '');
    auditar_(yo, acc, '', 'Personas', antes, publico_(u));
    return usuarios(token);
  });
}
function borrarUsuario(token, id) {
  const yo = permiso_(token, 'admin');
  return conCandado_(function () {
    const l = usuarios_(), u = l.filter(function (x) { return x.id === id; })[0];
    if (!u) return usuarios(token);
    if (u.rol === 'admin') throw new Error('La cuenta Admin no se puede borrar.');
    guardarUsuarios_(l.filter(function (x) { return x.id !== id; }));
    auditar_(yo, 'Borró a ' + u.nombre, '', 'Personas', publico_(u), null);
    return usuarios(token);
  });
}

function pedirCodigoAdmin(correo) {
  asegurar_();
  const a = adminDe_();
  const msg = 'Si ese es el correo de la cuenta Admin, te llegó un código. Revisa también la carpeta de spam.';
  if (!a || !a.correo || norm_(correo) !== norm_(a.correo)) { Utilities.sleep(500); return msg; }
  const prev = JSON.parse(props_().getProperty('codigoAdmin') || 'null');
  if (prev && Date.now() - prev.creado < 60000) return msg;
  const codigo = String(Math.floor(100000 + Math.random() * 900000));
  const sal = Utilities.getUuid();
  props_().setProperty('codigoAdmin', JSON.stringify({ sal: sal, hash: hash_(codigo, sal), exp: Date.now() + 15 * 60000, n: 0, creado: Date.now() }));
  MailApp.sendEmail(a.correo, 'Código para recuperar la caja de ' + NEGOCIO + ': ' + codigo,
    'Tu código para crear una clave nueva de Admin en la caja de ' + NEGOCIO + ' es:\n\n' + codigo + '\n\nVence en 15 minutos. Si no lo pediste tú, ignora este correo; tu clave sigue igual.');
  return msg;
}
function restablecerAdmin(correo, codigo, nueva, recordar) {
  asegurar_();
  return conCandado_(function () {
    const c = JSON.parse(props_().getProperty('codigoAdmin') || 'null');
    const l = usuarios_(); let a = adminDe_(l);
    if (!c || c.exp < Date.now()) throw new Error('El código venció o no existe. Pide uno nuevo.');
    if (a && a.correo && norm_(correo) !== norm_(a.correo) && !c.emergencia) throw new Error('El correo no coincide.');
    if (hash_(String(codigo || '').trim(), c.sal) !== c.hash) {
      c.n++; if (c.n >= 5) props_().deleteProperty('codigoAdmin'); else props_().setProperty('codigoAdmin', JSON.stringify(c));
      throw new Error('Código incorrecto.');
    }
    claveValida_('clave', nueva, 'admin');
    if (!a) { a = { id: 'u-admin', nombre: 'Admin', rol: 'admin', tipo: 'clave', activo: true, creado: Date.now(), correo: String(correo || '').trim() }; l.push(a); }
    ponerClave_(a, nueva); guardarUsuarios_(l);
    props_().deleteProperty('codigoAdmin'); props_().deleteProperty('fallos_' + a.id);
    auditar_(a, 'Recuperó la cuenta Admin', '', '', null, null);
    return token_(a, recordar);
  });
}
function codigoDeEmergencia() {
  const codigo = String(Math.floor(100000 + Math.random() * 900000)), sal = Utilities.getUuid();
  props_().setProperty('codigoAdmin', JSON.stringify({ sal: sal, hash: hash_(codigo, sal), exp: Date.now() + 30 * 60000, n: 0, creado: Date.now(), emergencia: true }));
  Logger.log('Código de emergencia para la cuenta Admin: ' + codigo + ' (vence en 30 minutos). En la caja: "¿Olvidaste la clave de Admin?" → "Ya tengo un código".');
  return codigo;
}
function autorizarCorreo() { return 'Correos disponibles hoy: ' + MailApp.getRemainingDailyQuota(); }

/* ---------- registro de cambios ---------- */
const AUD = ['Fecha y hora', 'Persona', 'Rol', 'Acción', 'Día', 'Qué', 'Antes', 'Después'];
function hojaAud_() {
  let sh = hoja_('Auditoria');
  if (!sh) {
    sh = ss_().insertSheet('Auditoria');
    sh.getRange(1, 1, 1, AUD.length).setValues([AUD]).setFontWeight('bold').setBackground(COLOR_ENC).setFontColor('#FFFFFF');
    sh.setFrozenRows(1);
  }
  return sh;
}
function corto_(o) { if (o == null) return ''; const t = typeof o === 'string' ? o : JSON.stringify(o); return t.length > 1500 ? t.slice(0, 1500) + '…' : t; }
function auditar_(u, accion, dia, que, antes, despues) {
  try {
    const sh = hojaAud_(), ahora = Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd HH:mm:ss');
    sh.getRange(sh.getLastRow() + 1, 1, 1, AUD.length).setValues([[txt_(ahora), u ? u.nombre : '', u ? (ROL_TXT[u.rol] || u.rol) : '', accion, dia ? txt_(dia) : '', que || '', corto_(antes), corto_(despues)]]);
    if (sh.getLastRow() > 40000) sh.deleteRows(2, 5000);
  } catch (e) { }
}
function auditoria(token, cuantos) {
  permiso_(token, 'admin');
  const sh = hojaAud_(), n = Math.min(Number(cuantos) || 400, 2000), last = sh.getLastRow();
  if (last < 2) return '[]';
  const desde = Math.max(2, last - n + 1);
  const v = sh.getRange(desde, 1, last - desde + 1, AUD.length).getValues().reverse();
  return JSON.stringify(v.map(function (r) { return { t: sinComilla_(r[0]), quien: r[1], rol: r[2], accion: r[3], dia: sinComilla_(r[4]), que: r[5], antes: r[6], despues: r[7] }; }));
}

/* ---------- respaldos en Drive ---------- */
function carpeta_() {
  const it = DriveApp.getFoldersByName('Respaldos El Rincón de Rincón');
  return it.hasNext() ? it.next() : DriveApp.createFolder('Respaldos El Rincón de Rincón');
}
function respaldar_(etiqueta) {
  const f = carpeta_();
  const nombre = 'Respaldo El Rincón de Rincón ' + Utilities.formatDate(new Date(), 'America/Bogota', 'yyyy-MM-dd HH.mm') + (etiqueta ? ' (' + etiqueta + ')' : '');
  const copia = DriveApp.getFileById(ss_().getId()).makeCopy(nombre, f);
  const lista = []; const it = f.getFiles(); while (it.hasNext()) lista.push(it.next());
  lista.filter(function (x) { return /\(automático\)/.test(x.getName()); })
    .sort(function (a, c) { return c.getDateCreated() - a.getDateCreated(); })
    .slice(12).forEach(function (x) { x.setTrashed(true); });
  return { nombre: nombre, url: copia.getUrl() };
}
function respaldarAhora(token) { permiso_(token, 'empleado'); return respaldar_(''); }
function respaldoSemanal() { respaldar_('automático'); }
function urlHoja(token) { permiso_(token, 'supervisor'); return ss_().getUrl(); }

const SEMILLA = {"items":[{"id":"pr-016","nombre":"Leche de cabra","emoji":"🥛","tipo":"producto","unidad":"L","stockIni":0,"stockMin":5,"costoRef":0,"cp":[],"activo":true,"recetas":[],"notas":"Sale del ordeño diario. El costo por litro se puede poner en \"Costo de referencia\".","pres":[{"id":"pe-017","nombre":"Botella 1 L","cant":1,"precio":12000,"emp":[{"item":"in-005","cant":1}],"activo":true},{"id":"pe-018","nombre":"Botella 750 ml","cant":0.75,"precio":9000,"emp":[{"item":"in-005","cant":1}],"activo":true}]},{"id":"pr-021","nombre":"Yogur de fresa","emoji":"🍓","tipo":"producto","unidad":"L","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"activo":true,"recetaDefault":"re-019","recetas":[{"id":"re-019","nombre":"Con mi leche (tanda de 7 L)","rinde":7,"ins":[{"item":"pr-016","cant":7},{"item":"in-001","cant":600},{"item":"in-012","cant":700},{"item":"in-003","cant":0.3333},{"item":"in-002","cant":0},{"item":"in-004","cant":7}],"extras":[]},{"id":"re-020","nombre":"Con base comprada (tanda de 7 L)","rinde":7,"ins":[{"item":"in-011","cant":7},{"item":"in-012","cant":700},{"item":"in-001","cant":200},{"item":"in-002","cant":0},{"item":"in-004","cant":7}],"extras":[]}],"pres":[{"id":"pe-022","nombre":"Tarro 1 L","cant":1,"precio":16000,"emp":[],"activo":true}]},{"id":"pr-025","nombre":"Yogur de mora","emoji":"🫐","tipo":"producto","unidad":"L","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"activo":true,"recetaDefault":"re-023","recetas":[{"id":"re-023","nombre":"Con mi leche (tanda de 7 L)","rinde":7,"ins":[{"item":"pr-016","cant":7},{"item":"in-001","cant":600},{"item":"in-013","cant":700},{"item":"in-003","cant":0.3333},{"item":"in-002","cant":0},{"item":"in-004","cant":7}],"extras":[]},{"id":"re-024","nombre":"Con base comprada (tanda de 7 L)","rinde":7,"ins":[{"item":"in-011","cant":7},{"item":"in-013","cant":700},{"item":"in-001","cant":200},{"item":"in-002","cant":0},{"item":"in-004","cant":7}],"extras":[]}],"pres":[{"id":"pe-026","nombre":"Tarro 1 L","cant":1,"precio":16000,"emp":[],"activo":true}]},{"id":"pr-029","nombre":"Yogur de melocotón","emoji":"🍑","tipo":"producto","unidad":"L","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"activo":true,"recetaDefault":"re-027","recetas":[{"id":"re-027","nombre":"Con mi leche (tanda de 7 L)","rinde":7,"ins":[{"item":"pr-016","cant":7},{"item":"in-001","cant":600},{"item":"in-014","cant":700},{"item":"in-003","cant":0.3333},{"item":"in-002","cant":0},{"item":"in-004","cant":7}],"extras":[]},{"id":"re-028","nombre":"Con base comprada (tanda de 7 L)","rinde":7,"ins":[{"item":"in-011","cant":7},{"item":"in-014","cant":700},{"item":"in-001","cant":200},{"item":"in-002","cant":0},{"item":"in-004","cant":7}],"extras":[]}],"pres":[{"id":"pe-030","nombre":"Tarro 1 L","cant":1,"precio":16000,"emp":[],"activo":true}]},{"id":"pr-033","nombre":"Yogur de piña","emoji":"🍍","tipo":"producto","unidad":"L","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"activo":true,"recetaDefault":"re-031","recetas":[{"id":"re-031","nombre":"Con mi leche (tanda de 7 L)","rinde":7,"ins":[{"item":"pr-016","cant":7},{"item":"in-001","cant":600},{"item":"in-015","cant":700},{"item":"in-003","cant":0.3333},{"item":"in-002","cant":0},{"item":"in-004","cant":7}],"extras":[]},{"id":"re-032","nombre":"Con base comprada (tanda de 7 L)","rinde":7,"ins":[{"item":"in-011","cant":7},{"item":"in-015","cant":700},{"item":"in-001","cant":200},{"item":"in-002","cant":0},{"item":"in-004","cant":7}],"extras":[]}],"pres":[{"id":"pe-034","nombre":"Tarro 1 L","cant":1,"precio":16000,"emp":[],"activo":true}]},{"id":"pr-037","nombre":"Yogur natural","emoji":"🥣","tipo":"producto","unidad":"L","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"activo":true,"recetaDefault":"re-035","recetas":[{"id":"re-035","nombre":"Con mi leche (tanda de 7 L)","rinde":7,"ins":[{"item":"pr-016","cant":7},{"item":"in-001","cant":400},{"item":"in-003","cant":0.3333},{"item":"in-002","cant":0},{"item":"in-004","cant":7}],"extras":[]},{"id":"re-036","nombre":"Con base comprada (tanda de 7 L)","rinde":7,"ins":[{"item":"in-011","cant":7},{"item":"in-001","cant":0},{"item":"in-002","cant":0},{"item":"in-004","cant":7}],"extras":[]}],"pres":[{"id":"pe-038","nombre":"Tarro 1 L","cant":1,"precio":16000,"emp":[],"activo":true}]},{"id":"pr-040","nombre":"Kéfir de cabra","emoji":"🥛","tipo":"producto","unidad":"L","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"activo":true,"recetaDefault":"re-039","recetas":[{"id":"re-039","nombre":"Tanda de 7 L","rinde":7,"ins":[{"item":"pr-016","cant":7},{"item":"in-001","cant":300},{"item":"in-010","cant":0},{"item":"in-004","cant":7}],"extras":[]}],"pres":[{"id":"pe-041","nombre":"Tarro 1 L","cant":1,"precio":16000,"emp":[],"activo":true}]},{"id":"pr-045","nombre":"Queso de cabra","emoji":"🧀","tipo":"producto","unidad":"g","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"activo":true,"recetaDefault":"re-044","recetas":[{"id":"re-044","nombre":"Tanda de 4 L de leche","rinde":500,"ins":[{"item":"pr-016","cant":4},{"item":"in-006","cant":0.25},{"item":"in-007","cant":0}],"extras":[{"item":"pr-042","cant":250,"pct":33}],"notas":"De 4 L de leche sale 1 libra (500 g) de queso y 250 g de ricota con el suero. El costo se reparte por peso (33% para la ricota). La sal de la salmuera (180 g por litro de agua, dura un mes) se puede repartir aquí."}],"pres":[{"id":"pe-046","nombre":"Queso 250 g","cant":250,"precio":16000,"emp":[{"item":"in-008","cant":1}],"activo":true},{"id":"pe-047","nombre":"Queso libra (500 g)","cant":500,"precio":28000,"emp":[{"item":"in-008","cant":1}],"activo":true}]},{"id":"pr-042","nombre":"Queso ricota","emoji":"🧀","tipo":"producto","unidad":"g","stockIni":0,"stockMin":0,"costoRef":0,"activo":true,"recetas":[],"cp":[{"n":"Recipiente 250 g","f":250}],"notas":"Sale del suero del queso (ver receta del queso). A veces se compra ya hecha a $10.000 el recipiente de 250 g.","pres":[{"id":"pe-043","nombre":"Ricota 250 g","cant":250,"precio":16000,"emp":[{"item":"in-009","cant":1}],"activo":true}]},{"id":"pr-048","nombre":"Huevos","emoji":"🥚","tipo":"producto","unidad":"und","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"recetas":[],"activo":true,"pres":[{"id":"pe-049","nombre":"Unidad","cant":1,"precio":1000,"emp":[],"activo":true}]},{"id":"pr-050","nombre":"Limones","emoji":"🍋","tipo":"producto","unidad":"kg","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"recetas":[],"activo":true,"pres":[{"id":"pe-051","nombre":"Kilo","cant":1,"precio":3000,"emp":[],"activo":true}]},{"id":"pr-052","nombre":"Papaya","emoji":"🍈","tipo":"producto","unidad":"und","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"recetas":[],"activo":true,"pres":[{"id":"pe-053","nombre":"Unidad","cant":1,"precio":0,"emp":[],"activo":true}]},{"id":"pr-054","nombre":"Racimo de plátano","emoji":"🍌","tipo":"producto","unidad":"und","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"recetas":[],"activo":true,"pres":[{"id":"pe-055","nombre":"Racimo","cant":1,"precio":0,"emp":[],"activo":true}]},{"id":"pr-056","nombre":"Racimo de banano","emoji":"🍌","tipo":"producto","unidad":"und","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"recetas":[],"activo":true,"pres":[{"id":"pe-057","nombre":"Racimo","cant":1,"precio":0,"emp":[],"activo":true}]},{"id":"in-001","nombre":"Azúcar","emoji":"🍬","tipo":"insumo","unidad":"g","stockIni":0,"stockMin":0,"costoRef":0,"cp":[{"n":"Libra (500 g)","f":500},{"n":"Kilo","f":1000},{"n":"Bulto 50 kg","f":50000}],"pres":[],"recetas":[],"activo":true},{"id":"in-012","nombre":"Fruta: fresa","emoji":"🍓","tipo":"insumo","unidad":"g","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"pres":[],"recetas":[],"activo":true},{"id":"in-013","nombre":"Fruta: mora","emoji":"🫐","tipo":"insumo","unidad":"g","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"pres":[],"recetas":[],"activo":true},{"id":"in-014","nombre":"Fruta: melocotón","emoji":"🍑","tipo":"insumo","unidad":"g","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"pres":[],"recetas":[],"activo":true},{"id":"in-015","nombre":"Fruta: piña","emoji":"🍍","tipo":"insumo","unidad":"g","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"pres":[],"recetas":[],"activo":true},{"id":"in-003","nombre":"Cultivo de yogur","emoji":"🧫","tipo":"insumo","unidad":"und","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"pres":[],"recetas":[],"activo":true,"notas":"Cada sobre rinde 3 tandas de yogur"},{"id":"in-002","nombre":"Conservante","emoji":"🧪","tipo":"insumo","unidad":"g","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"pres":[],"recetas":[],"activo":true},{"id":"in-004","nombre":"Tarro de 1 L","emoji":"🫙","tipo":"insumo","unidad":"und","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"pres":[],"recetas":[],"activo":true},{"id":"in-011","nombre":"Base de yogur (comprada)","emoji":"🥛","tipo":"insumo","unidad":"L","stockIni":0,"stockMin":0,"costoRef":11000,"cp":[],"pres":[],"recetas":[],"activo":true,"notas":"La venden a $11.000 el litro; hay que agregarle fruta, azúcar, conservante y tarro"},{"id":"in-010","nombre":"Cultivo de kéfir","emoji":"🧫","tipo":"insumo","unidad":"und","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"pres":[],"recetas":[],"activo":true},{"id":"in-006","nombre":"Pastilla de cuajo","emoji":"💊","tipo":"insumo","unidad":"und","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"pres":[],"recetas":[],"activo":true},{"id":"in-007","nombre":"Sal","emoji":"🧂","tipo":"insumo","unidad":"g","stockIni":0,"stockMin":0,"costoRef":0,"cp":[{"n":"Kilo","f":1000}],"pres":[],"recetas":[],"activo":true},{"id":"in-008","nombre":"Recipiente de queso","emoji":"🥡","tipo":"insumo","unidad":"und","stockIni":0,"stockMin":0,"costoRef":650,"cp":[{"n":"Paquete x12","f":12}],"pres":[],"recetas":[],"activo":true},{"id":"in-009","nombre":"Recipiente de ricota 250 g","emoji":"🥡","tipo":"insumo","unidad":"und","stockIni":0,"stockMin":0,"costoRef":0,"cp":[],"pres":[],"recetas":[],"activo":true},{"id":"in-005","nombre":"Botella PET de 1 L","emoji":"🍼","tipo":"insumo","unidad":"und","stockIni":0,"stockMin":0,"costoRef":1000,"cp":[{"n":"Paquete x24","f":24}],"pres":[],"recetas":[],"activo":true}],"cfg":{"negocio":"El Rincón de Rincón","itemLeche":"pr-016","lecheAuto":true,"personas":["Nataly","Jefferson"],"medios":[{"id":"efectivo","nombre":"Efectivo","emoji":"💵","inicial":0},{"id":"cajafuerte","nombre":"Caja fuerte","emoji":"🔐","inicial":0},{"id":"bancolombia","nombre":"Bancolombia (llave)","emoji":"🏦","inicial":0},{"id":"nequi","nombre":"Nequi","emoji":"📱","inicial":0}],"gastoCats":["Alimento de animales","Veterinario y medicinas","Empaques y botellas","Servicios","Transporte","Mano de obra","Otros"],"catInversion":["Terneras (inversión)"],"margenMin":30,"repartirGastos":true}};
