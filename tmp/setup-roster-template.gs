function setupRosterTemplate() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var headers = ["Apellido","Nombre","Género","Fecha de nacimiento","DNI","CUIL","Teléfono","Mail","Alimentación","Instrumento","Nota interna","Localidad"];
  var diets = ["Estándar","Celíaca","Diabética","Vegetariana","Vegana","Sin Sal","Sin Lactosa"];
  var instruments = ["Acompañante (Familia)","Acompañante Menor","Acordeón","Administración","Archivo","Arpa","Audiovisual","Bandoneón","Bombo","Caja","Campanas tubulares","Cantante Baritono","Cantante Mezzo","Cantante Soprano","Cantante Tenor","Celesta","Chofer","Clarinete","Clarinete Bajo/Requinto","Compositor","Contrabajo","Contrafagot","Corno","Corno Inglés","Coro","Director","Director Musical","Escenario","Fagot","Flauta","Guitarra","Iluminacion","Marimba","Menor","Oboe","Percusión","Piano","Platillos","Producción General","Proveedor","Saxofón","Solista Invitado","Sonido","Timbales","Transporte","Trombón","Trompeta","Tuba","Vibráfono","Viola","Violín","Violoncello","Voz","Xilófono"];
  var genero = ["M","F","-"];
  var localities = ["Aguada Cecilio","Aguada de Guerra","Allen","Bahía Blanca","Barda del Medio","CABA","Cafayate","Campo Grande","Carmen de Patagones","Catriel","Cervantes","Chelforó","Chichinales","Chimpay","Choele Choel","Cinco Saltos","Cipolletti","Ciudad Autonoma de Buenos Aires","Ciudad de Córdoba","Ciudad de Mendoza","Comallo","Comodoro Rivadavia","Concordia","Contralmirante Cordero","Contralmirante Guerrico","Córdoba","Coronel Belisle","Corrientes","Darwin","Dina Huapi","El Bolsón","El Calafate","El Cóndor","El Cuy","Epuyén","Ferri","Formosa","General Conesa","General E. Godoy","General Fernández Oro","General Pico","General Roca","Goya","Gualeguaychú","Guardia Mitre","Ing. Jacobacci","Ing. L. Huergo","La Plata","La Rioja","Lago Pellegrini","Lamarque","Las Grutas","Las Perlas","Los Menucos","Luis Beltrán","Mainqué","Mallín Ahogado","Mamuel Choique","Maquinchao","Mar del Plata","Mendoza","Ministro Ramos Mexía","Nahuel Niyeu","Neuquén","Ñorquinco","Oberá","Paraná","Paso de los Libres","Pilcaniyeu","Plottier","Pomona","Posadas","Presidencia Roque Sáenz Peña","Puerto Iguazú","Puerto Madryn","Rafaela","Rawson","Resistencia","Río Colorado","Río Cuarto","Río Gallegos","Río Grande","Rosario","Salta","San Antonio Oeste","San Carlos de Bariloche","San Fernando del Valle de Catamarca","San Javier","San Juan","San Luis","San Martín de los Andes","San Miguel de Tucumán","San Nicolás","San Rafael","San Salvador de Jujuy","Santa Fe","Santa Rosa","Santiago del Estero","Sargento Vidal","Sierra Colorada","Sierra Grande","Tafí del Valle","Tandil","Termas de Río Hondo","Trelew","Tunuyán","Ushuaia","Valcheta","Venado Tuerto","Viedma","Villa Carlos Paz","Villa La Angostura","Villa Manzano","Villa María","Villa Mercedes","Villa Regina","Villa San Isidro"];
  var LAST = 201;

  var personas = ss.getSheetByName('Personas');
  if (!personas) {
    personas = ss.getSheets()[0];
    personas.setName('Personas');
  }
  personas.clear();
  personas.getRange(1, 1, 1, headers.length).setValues([headers]);
  personas.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setFontColor('#ffffff')
    .setBackground('#4338CA')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  personas.setFrozenRows(1);
  personas.setColumnWidth(1, 120);
  personas.setColumnWidth(2, 110);
  personas.setColumnWidth(3, 70);
  personas.setColumnWidth(4, 130);
  personas.setColumnWidth(5, 100);
  personas.setColumnWidth(6, 110);
  personas.setColumnWidth(7, 110);
  personas.setColumnWidth(8, 180);
  personas.setColumnWidth(9, 110);
  personas.setColumnWidth(10, 150);
  personas.setColumnWidth(11, 180);
  personas.setColumnWidth(12, 130);
  personas.getRange('D2:D' + LAST).setNumberFormat('dd/mm/yyyy');

  var lists = ss.getSheetByName('_listas');
  if (lists) {
    lists.clear();
    lists.showSheet();
  } else {
    lists = ss.insertSheet('_listas');
  }
  for (var i = 0; i < diets.length; i++) lists.getRange(i + 1, 1).setValue(diets[i]);
  for (var j = 0; j < instruments.length; j++) lists.getRange(j + 1, 2).setValue(instruments[j]);
  for (var k = 0; k < genero.length; k++) lists.getRange(k + 1, 3).setValue(genero[k]);
  for (var m = 0; m < localities.length; m++) lists.getRange(m + 1, 4).setValue(localities[m]);

  var ruleG = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange(1, 3, genero.length, 3), true)
    .setAllowInvalid(true)
    .setHelpText('Elegí M, F o -')
    .build();
  var ruleA = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange(1, 1, diets.length, 1), true)
    .setAllowInvalid(true)
    .setHelpText('Elegí un valor de la lista')
    .build();
  var ruleI = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange(1, 2, instruments.length, 2), true)
    .setAllowInvalid(true)
    .setHelpText('Elegí un instrumento de la lista')
    .build();
  var ruleL = SpreadsheetApp.newDataValidation()
    .requireValueInRange(lists.getRange(1, 4, Math.max(localities.length, 1), 4), true)
    .setAllowInvalid(true)
    .setHelpText('Elegí una localidad de residencia')
    .build();
  personas.getRange('C2:C' + LAST).setDataValidation(ruleG);
  personas.getRange('I2:I' + LAST).setDataValidation(ruleA);
  personas.getRange('J2:J' + LAST).setDataValidation(ruleI);
  if (localities.length) personas.getRange('L2:L' + LAST).setDataValidation(ruleL);

  lists.hideSheet();
  ss.setActiveSheet(personas);
}
