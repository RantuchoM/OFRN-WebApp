/* Bundle de organicoConvocadoService + fetchRosterForGira. Regenerar con esbuild si cambia el roster. */

// src/utils/integranteIds.js
function integranteKey(id) {
  if (id == null || id === "") return "";
  return String(id);
}

// src/utils/integranteDisplayName.js
function trimText(value) {
  return String(value ?? "").trim();
}
function seatingNombre(person) {
  const pref = trimText(person?.nombre_preferencia);
  if (pref) return pref;
  if (person?.nombre_legal != null) return trimText(person.nombre_legal);
  return trimText(person?.nombre);
}
function seatingApellido(person) {
  const pref = trimText(person?.apellido_preferencia);
  if (pref) return pref;
  if (person?.apellido_legal != null) return trimText(person.apellido_legal);
  return trimText(person?.apellido);
}
function seatingApellidoNombre(person) {
  const apellido = seatingApellido(person);
  const nombre = seatingNombre(person);
  if (apellido && nombre) return `${apellido}, ${nombre}`;
  return apellido || nombre || "";
}

// src/utils/integranteDomicilioViaticos.js
function getResidenciaObjeto(person) {
  return person?._loc_residencia || person?.residencia || null;
}
function getViaticosObjeto(person) {
  return person?._loc_viaticos || person?.viaticos || null;
}
function getResidenciaId(person) {
  const res = getResidenciaObjeto(person);
  if (res?.id != null) return res.id;
  const explicit = person?.id_localidad_residencia;
  if (explicit != null && explicit !== "") return explicit;
  if (person?.id_localidad_residencia === void 0) {
    return person?.id_localidad ?? null;
  }
  return null;
}
function getResidenciaNombre(person) {
  return getResidenciaObjeto(person)?.localidad || "";
}
function getViaticosId(person) {
  const obj = getViaticosObjeto(person);
  return person?.id_loc_viaticos ?? obj?.id ?? null;
}
function getViaticosNombre(person) {
  return getViaticosObjeto(person)?.localidad || "";
}
function regionIdFromObj(obj) {
  if (!obj) return null;
  return obj.id_region ?? obj.regiones?.id ?? null;
}
function resolveLocalidadResidencia(person) {
  if (!person) {
    return { id: null, nombre: "", objeto: null, regionId: null };
  }
  const residenciaId = getResidenciaId(person);
  const objeto = getResidenciaObjeto(person);
  const nombre = getResidenciaNombre(person);
  return {
    id: residenciaId != null ? Number(residenciaId) : null,
    nombre,
    objeto: objeto || (residenciaId != null ? { id: residenciaId, localidad: nombre || void 0 } : null),
    regionId: regionIdFromObj(objeto)
  };
}
function resolveLocalidadEfectivaViaticos(person) {
  if (!person) {
    return { id: null, nombre: "", objeto: null, regionId: null };
  }
  const viaticosId = getViaticosId(person);
  if (viaticosId != null) {
    const objeto2 = getViaticosObjeto(person) || {
      id: viaticosId,
      localidad: getViaticosNombre(person) || void 0
    };
    const nombre2 = getViaticosNombre(person) || objeto2?.localidad || "";
    return {
      id: Number(viaticosId),
      nombre: nombre2,
      objeto: objeto2,
      regionId: regionIdFromObj(objeto2)
    };
  }
  const residenciaId = getResidenciaId(person);
  const objeto = getResidenciaObjeto(person);
  const nombre = getResidenciaNombre(person);
  return {
    id: residenciaId != null ? Number(residenciaId) : null,
    nombre,
    objeto: objeto || (residenciaId != null ? { id: residenciaId, localidad: nombre || void 0 } : null),
    regionId: regionIdFromObj(objeto)
  };
}
var SUFIJO_PROVINCIA_DJ = "de la Provincia de R\xEDo Negro";
var DOMICILIO_LABORAL_DJ_SEDE_OFRN = `Zatti 287, de la localidad de Viedma, ${SUFIJO_PROVINCIA_DJ}`;
var DOMICILIO_LABORAL_DJ_PUNTOS = ".".repeat(
  DOMICILIO_LABORAL_DJ_SEDE_OFRN.length
);

// node_modules/date-fns/constants.js
var daysInYear = 365.2425;
var maxTime = Math.pow(10, 8) * 24 * 60 * 60 * 1e3;
var minTime = -maxTime;
var millisecondsInWeek = 6048e5;
var millisecondsInDay = 864e5;
var secondsInHour = 3600;
var secondsInDay = secondsInHour * 24;
var secondsInWeek = secondsInDay * 7;
var secondsInYear = secondsInDay * daysInYear;
var secondsInMonth = secondsInYear / 12;
var secondsInQuarter = secondsInMonth * 3;
var constructFromSymbol = Symbol.for("constructDateFrom");

// node_modules/date-fns/constructFrom.js
function constructFrom(date, value) {
  if (typeof date === "function") return date(value);
  if (date && typeof date === "object" && constructFromSymbol in date)
    return date[constructFromSymbol](value);
  if (date instanceof Date) return new date.constructor(value);
  return new Date(value);
}

// node_modules/date-fns/toDate.js
function toDate(argument, context) {
  return constructFrom(context || argument, argument);
}

// node_modules/date-fns/_lib/defaultOptions.js
var defaultOptions = {};
function getDefaultOptions() {
  return defaultOptions;
}

// node_modules/date-fns/startOfWeek.js
function startOfWeek(date, options) {
  const defaultOptions2 = getDefaultOptions();
  const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions2.weekStartsOn ?? defaultOptions2.locale?.options?.weekStartsOn ?? 0;
  const _date = toDate(date, options?.in);
  const day = _date.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  _date.setDate(_date.getDate() - diff);
  _date.setHours(0, 0, 0, 0);
  return _date;
}

// node_modules/date-fns/startOfISOWeek.js
function startOfISOWeek(date, options) {
  return startOfWeek(date, { ...options, weekStartsOn: 1 });
}

// node_modules/date-fns/getISOWeekYear.js
function getISOWeekYear(date, options) {
  const _date = toDate(date, options?.in);
  const year = _date.getFullYear();
  const fourthOfJanuaryOfNextYear = constructFrom(_date, 0);
  fourthOfJanuaryOfNextYear.setFullYear(year + 1, 0, 4);
  fourthOfJanuaryOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfISOWeek(fourthOfJanuaryOfNextYear);
  const fourthOfJanuaryOfThisYear = constructFrom(_date, 0);
  fourthOfJanuaryOfThisYear.setFullYear(year, 0, 4);
  fourthOfJanuaryOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfISOWeek(fourthOfJanuaryOfThisYear);
  if (_date.getTime() >= startOfNextYear.getTime()) {
    return year + 1;
  } else if (_date.getTime() >= startOfThisYear.getTime()) {
    return year;
  } else {
    return year - 1;
  }
}

// node_modules/date-fns/_lib/getTimezoneOffsetInMilliseconds.js
function getTimezoneOffsetInMilliseconds(date) {
  const _date = toDate(date);
  const utcDate = new Date(
    Date.UTC(
      _date.getFullYear(),
      _date.getMonth(),
      _date.getDate(),
      _date.getHours(),
      _date.getMinutes(),
      _date.getSeconds(),
      _date.getMilliseconds()
    )
  );
  utcDate.setUTCFullYear(_date.getFullYear());
  return +date - +utcDate;
}

// node_modules/date-fns/_lib/normalizeDates.js
function normalizeDates(context, ...dates) {
  const normalize2 = constructFrom.bind(
    null,
    context || dates.find((date) => typeof date === "object")
  );
  return dates.map(normalize2);
}

// node_modules/date-fns/startOfDay.js
function startOfDay(date, options) {
  const _date = toDate(date, options?.in);
  _date.setHours(0, 0, 0, 0);
  return _date;
}

// node_modules/date-fns/differenceInCalendarDays.js
function differenceInCalendarDays(laterDate, earlierDate, options) {
  const [laterDate_, earlierDate_] = normalizeDates(
    options?.in,
    laterDate,
    earlierDate
  );
  const laterStartOfDay = startOfDay(laterDate_);
  const earlierStartOfDay = startOfDay(earlierDate_);
  const laterTimestamp = +laterStartOfDay - getTimezoneOffsetInMilliseconds(laterStartOfDay);
  const earlierTimestamp = +earlierStartOfDay - getTimezoneOffsetInMilliseconds(earlierStartOfDay);
  return Math.round((laterTimestamp - earlierTimestamp) / millisecondsInDay);
}

// node_modules/date-fns/startOfISOWeekYear.js
function startOfISOWeekYear(date, options) {
  const year = getISOWeekYear(date, options);
  const fourthOfJanuary = constructFrom(options?.in || date, 0);
  fourthOfJanuary.setFullYear(year, 0, 4);
  fourthOfJanuary.setHours(0, 0, 0, 0);
  return startOfISOWeek(fourthOfJanuary);
}

// node_modules/date-fns/isDate.js
function isDate(value) {
  return value instanceof Date || typeof value === "object" && Object.prototype.toString.call(value) === "[object Date]";
}

// node_modules/date-fns/isValid.js
function isValid(date) {
  return !(!isDate(date) && typeof date !== "number" || isNaN(+toDate(date)));
}

// node_modules/date-fns/startOfYear.js
function startOfYear(date, options) {
  const date_ = toDate(date, options?.in);
  date_.setFullYear(date_.getFullYear(), 0, 1);
  date_.setHours(0, 0, 0, 0);
  return date_;
}

// node_modules/date-fns/locale/en-US/_lib/formatDistance.js
var formatDistanceLocale = {
  lessThanXSeconds: {
    one: "less than a second",
    other: "less than {{count}} seconds"
  },
  xSeconds: {
    one: "1 second",
    other: "{{count}} seconds"
  },
  halfAMinute: "half a minute",
  lessThanXMinutes: {
    one: "less than a minute",
    other: "less than {{count}} minutes"
  },
  xMinutes: {
    one: "1 minute",
    other: "{{count}} minutes"
  },
  aboutXHours: {
    one: "about 1 hour",
    other: "about {{count}} hours"
  },
  xHours: {
    one: "1 hour",
    other: "{{count}} hours"
  },
  xDays: {
    one: "1 day",
    other: "{{count}} days"
  },
  aboutXWeeks: {
    one: "about 1 week",
    other: "about {{count}} weeks"
  },
  xWeeks: {
    one: "1 week",
    other: "{{count}} weeks"
  },
  aboutXMonths: {
    one: "about 1 month",
    other: "about {{count}} months"
  },
  xMonths: {
    one: "1 month",
    other: "{{count}} months"
  },
  aboutXYears: {
    one: "about 1 year",
    other: "about {{count}} years"
  },
  xYears: {
    one: "1 year",
    other: "{{count}} years"
  },
  overXYears: {
    one: "over 1 year",
    other: "over {{count}} years"
  },
  almostXYears: {
    one: "almost 1 year",
    other: "almost {{count}} years"
  }
};
var formatDistance = (token, count, options) => {
  let result;
  const tokenValue = formatDistanceLocale[token];
  if (typeof tokenValue === "string") {
    result = tokenValue;
  } else if (count === 1) {
    result = tokenValue.one;
  } else {
    result = tokenValue.other.replace("{{count}}", count.toString());
  }
  if (options?.addSuffix) {
    if (options.comparison && options.comparison > 0) {
      return "in " + result;
    } else {
      return result + " ago";
    }
  }
  return result;
};

// node_modules/date-fns/locale/_lib/buildFormatLongFn.js
function buildFormatLongFn(args) {
  return (options = {}) => {
    const width = options.width ? String(options.width) : args.defaultWidth;
    const format2 = args.formats[width] || args.formats[args.defaultWidth];
    return format2;
  };
}

// node_modules/date-fns/locale/en-US/_lib/formatLong.js
var dateFormats = {
  full: "EEEE, MMMM do, y",
  long: "MMMM do, y",
  medium: "MMM d, y",
  short: "MM/dd/yyyy"
};
var timeFormats = {
  full: "h:mm:ss a zzzz",
  long: "h:mm:ss a z",
  medium: "h:mm:ss a",
  short: "h:mm a"
};
var dateTimeFormats = {
  full: "{{date}} 'at' {{time}}",
  long: "{{date}} 'at' {{time}}",
  medium: "{{date}}, {{time}}",
  short: "{{date}}, {{time}}"
};
var formatLong = {
  date: buildFormatLongFn({
    formats: dateFormats,
    defaultWidth: "full"
  }),
  time: buildFormatLongFn({
    formats: timeFormats,
    defaultWidth: "full"
  }),
  dateTime: buildFormatLongFn({
    formats: dateTimeFormats,
    defaultWidth: "full"
  })
};

// node_modules/date-fns/locale/en-US/_lib/formatRelative.js
var formatRelativeLocale = {
  lastWeek: "'last' eeee 'at' p",
  yesterday: "'yesterday at' p",
  today: "'today at' p",
  tomorrow: "'tomorrow at' p",
  nextWeek: "eeee 'at' p",
  other: "P"
};
var formatRelative = (token, _date, _baseDate, _options) => formatRelativeLocale[token];

// node_modules/date-fns/locale/_lib/buildLocalizeFn.js
function buildLocalizeFn(args) {
  return (value, options) => {
    const context = options?.context ? String(options.context) : "standalone";
    let valuesArray;
    if (context === "formatting" && args.formattingValues) {
      const defaultWidth = args.defaultFormattingWidth || args.defaultWidth;
      const width = options?.width ? String(options.width) : defaultWidth;
      valuesArray = args.formattingValues[width] || args.formattingValues[defaultWidth];
    } else {
      const defaultWidth = args.defaultWidth;
      const width = options?.width ? String(options.width) : args.defaultWidth;
      valuesArray = args.values[width] || args.values[defaultWidth];
    }
    const index = args.argumentCallback ? args.argumentCallback(value) : value;
    return valuesArray[index];
  };
}

// node_modules/date-fns/locale/en-US/_lib/localize.js
var eraValues = {
  narrow: ["B", "A"],
  abbreviated: ["BC", "AD"],
  wide: ["Before Christ", "Anno Domini"]
};
var quarterValues = {
  narrow: ["1", "2", "3", "4"],
  abbreviated: ["Q1", "Q2", "Q3", "Q4"],
  wide: ["1st quarter", "2nd quarter", "3rd quarter", "4th quarter"]
};
var monthValues = {
  narrow: ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"],
  abbreviated: [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ],
  wide: [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ]
};
var dayValues = {
  narrow: ["S", "M", "T", "W", "T", "F", "S"],
  short: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
  abbreviated: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
  wide: [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday"
  ]
};
var dayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "morning",
    afternoon: "afternoon",
    evening: "evening",
    night: "night"
  }
};
var formattingDayPeriodValues = {
  narrow: {
    am: "a",
    pm: "p",
    midnight: "mi",
    noon: "n",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  abbreviated: {
    am: "AM",
    pm: "PM",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  },
  wide: {
    am: "a.m.",
    pm: "p.m.",
    midnight: "midnight",
    noon: "noon",
    morning: "in the morning",
    afternoon: "in the afternoon",
    evening: "in the evening",
    night: "at night"
  }
};
var ordinalNumber = (dirtyNumber, _options) => {
  const number = Number(dirtyNumber);
  const rem100 = number % 100;
  if (rem100 > 20 || rem100 < 10) {
    switch (rem100 % 10) {
      case 1:
        return number + "st";
      case 2:
        return number + "nd";
      case 3:
        return number + "rd";
    }
  }
  return number + "th";
};
var localize = {
  ordinalNumber,
  era: buildLocalizeFn({
    values: eraValues,
    defaultWidth: "wide"
  }),
  quarter: buildLocalizeFn({
    values: quarterValues,
    defaultWidth: "wide",
    argumentCallback: (quarter) => quarter - 1
  }),
  month: buildLocalizeFn({
    values: monthValues,
    defaultWidth: "wide"
  }),
  day: buildLocalizeFn({
    values: dayValues,
    defaultWidth: "wide"
  }),
  dayPeriod: buildLocalizeFn({
    values: dayPeriodValues,
    defaultWidth: "wide",
    formattingValues: formattingDayPeriodValues,
    defaultFormattingWidth: "wide"
  })
};

// node_modules/date-fns/locale/_lib/buildMatchFn.js
function buildMatchFn(args) {
  return (string, options = {}) => {
    const width = options.width;
    const matchPattern = width && args.matchPatterns[width] || args.matchPatterns[args.defaultMatchWidth];
    const matchResult = string.match(matchPattern);
    if (!matchResult) {
      return null;
    }
    const matchedString = matchResult[0];
    const parsePatterns = width && args.parsePatterns[width] || args.parsePatterns[args.defaultParseWidth];
    const key = Array.isArray(parsePatterns) ? findIndex(parsePatterns, (pattern) => pattern.test(matchedString)) : (
      // [TODO] -- I challenge you to fix the type
      findKey(parsePatterns, (pattern) => pattern.test(matchedString))
    );
    let value;
    value = args.valueCallback ? args.valueCallback(key) : key;
    value = options.valueCallback ? (
      // [TODO] -- I challenge you to fix the type
      options.valueCallback(value)
    ) : value;
    const rest = string.slice(matchedString.length);
    return { value, rest };
  };
}
function findKey(object, predicate) {
  for (const key in object) {
    if (Object.prototype.hasOwnProperty.call(object, key) && predicate(object[key])) {
      return key;
    }
  }
  return void 0;
}
function findIndex(array, predicate) {
  for (let key = 0; key < array.length; key++) {
    if (predicate(array[key])) {
      return key;
    }
  }
  return void 0;
}

// node_modules/date-fns/locale/_lib/buildMatchPatternFn.js
function buildMatchPatternFn(args) {
  return (string, options = {}) => {
    const matchResult = string.match(args.matchPattern);
    if (!matchResult) return null;
    const matchedString = matchResult[0];
    const parseResult = string.match(args.parsePattern);
    if (!parseResult) return null;
    let value = args.valueCallback ? args.valueCallback(parseResult[0]) : parseResult[0];
    value = options.valueCallback ? options.valueCallback(value) : value;
    const rest = string.slice(matchedString.length);
    return { value, rest };
  };
}

// node_modules/date-fns/locale/en-US/_lib/match.js
var matchOrdinalNumberPattern = /^(\d+)(th|st|nd|rd)?/i;
var parseOrdinalNumberPattern = /\d+/i;
var matchEraPatterns = {
  narrow: /^(b|a)/i,
  abbreviated: /^(b\.?\s?c\.?|b\.?\s?c\.?\s?e\.?|a\.?\s?d\.?|c\.?\s?e\.?)/i,
  wide: /^(before christ|before common era|anno domini|common era)/i
};
var parseEraPatterns = {
  any: [/^b/i, /^(a|c)/i]
};
var matchQuarterPatterns = {
  narrow: /^[1234]/i,
  abbreviated: /^q[1234]/i,
  wide: /^[1234](th|st|nd|rd)? quarter/i
};
var parseQuarterPatterns = {
  any: [/1/i, /2/i, /3/i, /4/i]
};
var matchMonthPatterns = {
  narrow: /^[jfmasond]/i,
  abbreviated: /^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i,
  wide: /^(january|february|march|april|may|june|july|august|september|october|november|december)/i
};
var parseMonthPatterns = {
  narrow: [
    /^j/i,
    /^f/i,
    /^m/i,
    /^a/i,
    /^m/i,
    /^j/i,
    /^j/i,
    /^a/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ],
  any: [
    /^ja/i,
    /^f/i,
    /^mar/i,
    /^ap/i,
    /^may/i,
    /^jun/i,
    /^jul/i,
    /^au/i,
    /^s/i,
    /^o/i,
    /^n/i,
    /^d/i
  ]
};
var matchDayPatterns = {
  narrow: /^[smtwf]/i,
  short: /^(su|mo|tu|we|th|fr|sa)/i,
  abbreviated: /^(sun|mon|tue|wed|thu|fri|sat)/i,
  wide: /^(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i
};
var parseDayPatterns = {
  narrow: [/^s/i, /^m/i, /^t/i, /^w/i, /^t/i, /^f/i, /^s/i],
  any: [/^su/i, /^m/i, /^tu/i, /^w/i, /^th/i, /^f/i, /^sa/i]
};
var matchDayPeriodPatterns = {
  narrow: /^(a|p|mi|n|(in the|at) (morning|afternoon|evening|night))/i,
  any: /^([ap]\.?\s?m\.?|midnight|noon|(in the|at) (morning|afternoon|evening|night))/i
};
var parseDayPeriodPatterns = {
  any: {
    am: /^a/i,
    pm: /^p/i,
    midnight: /^mi/i,
    noon: /^no/i,
    morning: /morning/i,
    afternoon: /afternoon/i,
    evening: /evening/i,
    night: /night/i
  }
};
var match = {
  ordinalNumber: buildMatchPatternFn({
    matchPattern: matchOrdinalNumberPattern,
    parsePattern: parseOrdinalNumberPattern,
    valueCallback: (value) => parseInt(value, 10)
  }),
  era: buildMatchFn({
    matchPatterns: matchEraPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseEraPatterns,
    defaultParseWidth: "any"
  }),
  quarter: buildMatchFn({
    matchPatterns: matchQuarterPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseQuarterPatterns,
    defaultParseWidth: "any",
    valueCallback: (index) => index + 1
  }),
  month: buildMatchFn({
    matchPatterns: matchMonthPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseMonthPatterns,
    defaultParseWidth: "any"
  }),
  day: buildMatchFn({
    matchPatterns: matchDayPatterns,
    defaultMatchWidth: "wide",
    parsePatterns: parseDayPatterns,
    defaultParseWidth: "any"
  }),
  dayPeriod: buildMatchFn({
    matchPatterns: matchDayPeriodPatterns,
    defaultMatchWidth: "any",
    parsePatterns: parseDayPeriodPatterns,
    defaultParseWidth: "any"
  })
};

// node_modules/date-fns/locale/en-US.js
var enUS = {
  code: "en-US",
  formatDistance,
  formatLong,
  formatRelative,
  localize,
  match,
  options: {
    weekStartsOn: 0,
    firstWeekContainsDate: 1
  }
};

// node_modules/date-fns/getDayOfYear.js
function getDayOfYear(date, options) {
  const _date = toDate(date, options?.in);
  const diff = differenceInCalendarDays(_date, startOfYear(_date));
  const dayOfYear = diff + 1;
  return dayOfYear;
}

// node_modules/date-fns/getISOWeek.js
function getISOWeek(date, options) {
  const _date = toDate(date, options?.in);
  const diff = +startOfISOWeek(_date) - +startOfISOWeekYear(_date);
  return Math.round(diff / millisecondsInWeek) + 1;
}

// node_modules/date-fns/getWeekYear.js
function getWeekYear(date, options) {
  const _date = toDate(date, options?.in);
  const year = _date.getFullYear();
  const defaultOptions2 = getDefaultOptions();
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions2.firstWeekContainsDate ?? defaultOptions2.locale?.options?.firstWeekContainsDate ?? 1;
  const firstWeekOfNextYear = constructFrom(options?.in || date, 0);
  firstWeekOfNextYear.setFullYear(year + 1, 0, firstWeekContainsDate);
  firstWeekOfNextYear.setHours(0, 0, 0, 0);
  const startOfNextYear = startOfWeek(firstWeekOfNextYear, options);
  const firstWeekOfThisYear = constructFrom(options?.in || date, 0);
  firstWeekOfThisYear.setFullYear(year, 0, firstWeekContainsDate);
  firstWeekOfThisYear.setHours(0, 0, 0, 0);
  const startOfThisYear = startOfWeek(firstWeekOfThisYear, options);
  if (+_date >= +startOfNextYear) {
    return year + 1;
  } else if (+_date >= +startOfThisYear) {
    return year;
  } else {
    return year - 1;
  }
}

// node_modules/date-fns/startOfWeekYear.js
function startOfWeekYear(date, options) {
  const defaultOptions2 = getDefaultOptions();
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions2.firstWeekContainsDate ?? defaultOptions2.locale?.options?.firstWeekContainsDate ?? 1;
  const year = getWeekYear(date, options);
  const firstWeek = constructFrom(options?.in || date, 0);
  firstWeek.setFullYear(year, 0, firstWeekContainsDate);
  firstWeek.setHours(0, 0, 0, 0);
  const _date = startOfWeek(firstWeek, options);
  return _date;
}

// node_modules/date-fns/getWeek.js
function getWeek(date, options) {
  const _date = toDate(date, options?.in);
  const diff = +startOfWeek(_date, options) - +startOfWeekYear(_date, options);
  return Math.round(diff / millisecondsInWeek) + 1;
}

// node_modules/date-fns/_lib/addLeadingZeros.js
function addLeadingZeros(number, targetLength) {
  const sign = number < 0 ? "-" : "";
  const output = Math.abs(number).toString().padStart(targetLength, "0");
  return sign + output;
}

// node_modules/date-fns/_lib/format/lightFormatters.js
var lightFormatters = {
  // Year
  y(date, token) {
    const signedYear = date.getFullYear();
    const year = signedYear > 0 ? signedYear : 1 - signedYear;
    return addLeadingZeros(token === "yy" ? year % 100 : year, token.length);
  },
  // Month
  M(date, token) {
    const month = date.getMonth();
    return token === "M" ? String(month + 1) : addLeadingZeros(month + 1, 2);
  },
  // Day of the month
  d(date, token) {
    return addLeadingZeros(date.getDate(), token.length);
  },
  // AM or PM
  a(date, token) {
    const dayPeriodEnumValue = date.getHours() / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return dayPeriodEnumValue.toUpperCase();
      case "aaa":
        return dayPeriodEnumValue;
      case "aaaaa":
        return dayPeriodEnumValue[0];
      case "aaaa":
      default:
        return dayPeriodEnumValue === "am" ? "a.m." : "p.m.";
    }
  },
  // Hour [1-12]
  h(date, token) {
    return addLeadingZeros(date.getHours() % 12 || 12, token.length);
  },
  // Hour [0-23]
  H(date, token) {
    return addLeadingZeros(date.getHours(), token.length);
  },
  // Minute
  m(date, token) {
    return addLeadingZeros(date.getMinutes(), token.length);
  },
  // Second
  s(date, token) {
    return addLeadingZeros(date.getSeconds(), token.length);
  },
  // Fraction of second
  S(date, token) {
    const numberOfDigits = token.length;
    const milliseconds = date.getMilliseconds();
    const fractionalSeconds = Math.trunc(
      milliseconds * Math.pow(10, numberOfDigits - 3)
    );
    return addLeadingZeros(fractionalSeconds, token.length);
  }
};

// node_modules/date-fns/_lib/format/formatters.js
var dayPeriodEnum = {
  am: "am",
  pm: "pm",
  midnight: "midnight",
  noon: "noon",
  morning: "morning",
  afternoon: "afternoon",
  evening: "evening",
  night: "night"
};
var formatters = {
  // Era
  G: function(date, token, localize2) {
    const era = date.getFullYear() > 0 ? 1 : 0;
    switch (token) {
      case "G":
      case "GG":
      case "GGG":
        return localize2.era(era, { width: "abbreviated" });
      case "GGGGG":
        return localize2.era(era, { width: "narrow" });
      case "GGGG":
      default:
        return localize2.era(era, { width: "wide" });
    }
  },
  // Year
  y: function(date, token, localize2) {
    if (token === "yo") {
      const signedYear = date.getFullYear();
      const year = signedYear > 0 ? signedYear : 1 - signedYear;
      return localize2.ordinalNumber(year, { unit: "year" });
    }
    return lightFormatters.y(date, token);
  },
  // Local week-numbering year
  Y: function(date, token, localize2, options) {
    const signedWeekYear = getWeekYear(date, options);
    const weekYear = signedWeekYear > 0 ? signedWeekYear : 1 - signedWeekYear;
    if (token === "YY") {
      const twoDigitYear = weekYear % 100;
      return addLeadingZeros(twoDigitYear, 2);
    }
    if (token === "Yo") {
      return localize2.ordinalNumber(weekYear, { unit: "year" });
    }
    return addLeadingZeros(weekYear, token.length);
  },
  // ISO week-numbering year
  R: function(date, token) {
    const isoWeekYear = getISOWeekYear(date);
    return addLeadingZeros(isoWeekYear, token.length);
  },
  // Extended year. This is a single number designating the year of this calendar system.
  // The main difference between `y` and `u` localizers are B.C. years:
  // | Year | `y` | `u` |
  // |------|-----|-----|
  // | AC 1 |   1 |   1 |
  // | BC 1 |   1 |   0 |
  // | BC 2 |   2 |  -1 |
  // Also `yy` always returns the last two digits of a year,
  // while `uu` pads single digit years to 2 characters and returns other years unchanged.
  u: function(date, token) {
    const year = date.getFullYear();
    return addLeadingZeros(year, token.length);
  },
  // Quarter
  Q: function(date, token, localize2) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token) {
      case "Q":
        return String(quarter);
      case "QQ":
        return addLeadingZeros(quarter, 2);
      case "Qo":
        return localize2.ordinalNumber(quarter, { unit: "quarter" });
      case "QQQ":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "formatting"
        });
      case "QQQQQ":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "formatting"
        });
      case "QQQQ":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Stand-alone quarter
  q: function(date, token, localize2) {
    const quarter = Math.ceil((date.getMonth() + 1) / 3);
    switch (token) {
      case "q":
        return String(quarter);
      case "qq":
        return addLeadingZeros(quarter, 2);
      case "qo":
        return localize2.ordinalNumber(quarter, { unit: "quarter" });
      case "qqq":
        return localize2.quarter(quarter, {
          width: "abbreviated",
          context: "standalone"
        });
      case "qqqqq":
        return localize2.quarter(quarter, {
          width: "narrow",
          context: "standalone"
        });
      case "qqqq":
      default:
        return localize2.quarter(quarter, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  // Month
  M: function(date, token, localize2) {
    const month = date.getMonth();
    switch (token) {
      case "M":
      case "MM":
        return lightFormatters.M(date, token);
      case "Mo":
        return localize2.ordinalNumber(month + 1, { unit: "month" });
      case "MMM":
        return localize2.month(month, {
          width: "abbreviated",
          context: "formatting"
        });
      case "MMMMM":
        return localize2.month(month, {
          width: "narrow",
          context: "formatting"
        });
      case "MMMM":
      default:
        return localize2.month(month, { width: "wide", context: "formatting" });
    }
  },
  // Stand-alone month
  L: function(date, token, localize2) {
    const month = date.getMonth();
    switch (token) {
      case "L":
        return String(month + 1);
      case "LL":
        return addLeadingZeros(month + 1, 2);
      case "Lo":
        return localize2.ordinalNumber(month + 1, { unit: "month" });
      case "LLL":
        return localize2.month(month, {
          width: "abbreviated",
          context: "standalone"
        });
      case "LLLLL":
        return localize2.month(month, {
          width: "narrow",
          context: "standalone"
        });
      case "LLLL":
      default:
        return localize2.month(month, { width: "wide", context: "standalone" });
    }
  },
  // Local week of year
  w: function(date, token, localize2, options) {
    const week = getWeek(date, options);
    if (token === "wo") {
      return localize2.ordinalNumber(week, { unit: "week" });
    }
    return addLeadingZeros(week, token.length);
  },
  // ISO week of year
  I: function(date, token, localize2) {
    const isoWeek = getISOWeek(date);
    if (token === "Io") {
      return localize2.ordinalNumber(isoWeek, { unit: "week" });
    }
    return addLeadingZeros(isoWeek, token.length);
  },
  // Day of the month
  d: function(date, token, localize2) {
    if (token === "do") {
      return localize2.ordinalNumber(date.getDate(), { unit: "date" });
    }
    return lightFormatters.d(date, token);
  },
  // Day of year
  D: function(date, token, localize2) {
    const dayOfYear = getDayOfYear(date);
    if (token === "Do") {
      return localize2.ordinalNumber(dayOfYear, { unit: "dayOfYear" });
    }
    return addLeadingZeros(dayOfYear, token.length);
  },
  // Day of week
  E: function(date, token, localize2) {
    const dayOfWeek = date.getDay();
    switch (token) {
      case "E":
      case "EE":
      case "EEE":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      case "EEEEE":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      case "EEEEEE":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      case "EEEE":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Local day of week
  e: function(date, token, localize2, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      case "e":
        return String(localDayOfWeek);
      case "ee":
        return addLeadingZeros(localDayOfWeek, 2);
      case "eo":
        return localize2.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "eee":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      case "eeeee":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      case "eeeeee":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      case "eeee":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Stand-alone local day of week
  c: function(date, token, localize2, options) {
    const dayOfWeek = date.getDay();
    const localDayOfWeek = (dayOfWeek - options.weekStartsOn + 8) % 7 || 7;
    switch (token) {
      case "c":
        return String(localDayOfWeek);
      case "cc":
        return addLeadingZeros(localDayOfWeek, token.length);
      case "co":
        return localize2.ordinalNumber(localDayOfWeek, { unit: "day" });
      case "ccc":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "standalone"
        });
      case "ccccc":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "standalone"
        });
      case "cccccc":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "standalone"
        });
      case "cccc":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "standalone"
        });
    }
  },
  // ISO day of week
  i: function(date, token, localize2) {
    const dayOfWeek = date.getDay();
    const isoDayOfWeek = dayOfWeek === 0 ? 7 : dayOfWeek;
    switch (token) {
      case "i":
        return String(isoDayOfWeek);
      case "ii":
        return addLeadingZeros(isoDayOfWeek, token.length);
      case "io":
        return localize2.ordinalNumber(isoDayOfWeek, { unit: "day" });
      case "iii":
        return localize2.day(dayOfWeek, {
          width: "abbreviated",
          context: "formatting"
        });
      case "iiiii":
        return localize2.day(dayOfWeek, {
          width: "narrow",
          context: "formatting"
        });
      case "iiiiii":
        return localize2.day(dayOfWeek, {
          width: "short",
          context: "formatting"
        });
      case "iiii":
      default:
        return localize2.day(dayOfWeek, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // AM or PM
  a: function(date, token, localize2) {
    const hours = date.getHours();
    const dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    switch (token) {
      case "a":
      case "aa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "aaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "aaaaa":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "aaaa":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // AM, PM, midnight, noon
  b: function(date, token, localize2) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours === 12) {
      dayPeriodEnumValue = dayPeriodEnum.noon;
    } else if (hours === 0) {
      dayPeriodEnumValue = dayPeriodEnum.midnight;
    } else {
      dayPeriodEnumValue = hours / 12 >= 1 ? "pm" : "am";
    }
    switch (token) {
      case "b":
      case "bb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "bbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        }).toLowerCase();
      case "bbbbb":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "bbbb":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // in the morning, in the afternoon, in the evening, at night
  B: function(date, token, localize2) {
    const hours = date.getHours();
    let dayPeriodEnumValue;
    if (hours >= 17) {
      dayPeriodEnumValue = dayPeriodEnum.evening;
    } else if (hours >= 12) {
      dayPeriodEnumValue = dayPeriodEnum.afternoon;
    } else if (hours >= 4) {
      dayPeriodEnumValue = dayPeriodEnum.morning;
    } else {
      dayPeriodEnumValue = dayPeriodEnum.night;
    }
    switch (token) {
      case "B":
      case "BB":
      case "BBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "abbreviated",
          context: "formatting"
        });
      case "BBBBB":
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "narrow",
          context: "formatting"
        });
      case "BBBB":
      default:
        return localize2.dayPeriod(dayPeriodEnumValue, {
          width: "wide",
          context: "formatting"
        });
    }
  },
  // Hour [1-12]
  h: function(date, token, localize2) {
    if (token === "ho") {
      let hours = date.getHours() % 12;
      if (hours === 0) hours = 12;
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return lightFormatters.h(date, token);
  },
  // Hour [0-23]
  H: function(date, token, localize2) {
    if (token === "Ho") {
      return localize2.ordinalNumber(date.getHours(), { unit: "hour" });
    }
    return lightFormatters.H(date, token);
  },
  // Hour [0-11]
  K: function(date, token, localize2) {
    const hours = date.getHours() % 12;
    if (token === "Ko") {
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token.length);
  },
  // Hour [1-24]
  k: function(date, token, localize2) {
    let hours = date.getHours();
    if (hours === 0) hours = 24;
    if (token === "ko") {
      return localize2.ordinalNumber(hours, { unit: "hour" });
    }
    return addLeadingZeros(hours, token.length);
  },
  // Minute
  m: function(date, token, localize2) {
    if (token === "mo") {
      return localize2.ordinalNumber(date.getMinutes(), { unit: "minute" });
    }
    return lightFormatters.m(date, token);
  },
  // Second
  s: function(date, token, localize2) {
    if (token === "so") {
      return localize2.ordinalNumber(date.getSeconds(), { unit: "second" });
    }
    return lightFormatters.s(date, token);
  },
  // Fraction of second
  S: function(date, token) {
    return lightFormatters.S(date, token);
  },
  // Timezone (ISO-8601. If offset is 0, output is always `'Z'`)
  X: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    if (timezoneOffset === 0) {
      return "Z";
    }
    switch (token) {
      case "X":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      case "XXXX":
      case "XX":
        return formatTimezone(timezoneOffset);
      case "XXXXX":
      case "XXX":
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (ISO-8601. If offset is 0, output is `'+00:00'` or equivalent)
  x: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      case "x":
        return formatTimezoneWithOptionalMinutes(timezoneOffset);
      case "xxxx":
      case "xx":
        return formatTimezone(timezoneOffset);
      case "xxxxx":
      case "xxx":
      default:
        return formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (GMT)
  O: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      case "O":
      case "OO":
      case "OOO":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      case "OOOO":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  // Timezone (specific non-location)
  z: function(date, token, _localize) {
    const timezoneOffset = date.getTimezoneOffset();
    switch (token) {
      case "z":
      case "zz":
      case "zzz":
        return "GMT" + formatTimezoneShort(timezoneOffset, ":");
      case "zzzz":
      default:
        return "GMT" + formatTimezone(timezoneOffset, ":");
    }
  },
  // Seconds timestamp
  t: function(date, token, _localize) {
    const timestamp = Math.trunc(+date / 1e3);
    return addLeadingZeros(timestamp, token.length);
  },
  // Milliseconds timestamp
  T: function(date, token, _localize) {
    return addLeadingZeros(+date, token.length);
  }
};
function formatTimezoneShort(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = Math.trunc(absOffset / 60);
  const minutes = absOffset % 60;
  if (minutes === 0) {
    return sign + String(hours);
  }
  return sign + String(hours) + delimiter + addLeadingZeros(minutes, 2);
}
function formatTimezoneWithOptionalMinutes(offset, delimiter) {
  if (offset % 60 === 0) {
    const sign = offset > 0 ? "-" : "+";
    return sign + addLeadingZeros(Math.abs(offset) / 60, 2);
  }
  return formatTimezone(offset, delimiter);
}
function formatTimezone(offset, delimiter = "") {
  const sign = offset > 0 ? "-" : "+";
  const absOffset = Math.abs(offset);
  const hours = addLeadingZeros(Math.trunc(absOffset / 60), 2);
  const minutes = addLeadingZeros(absOffset % 60, 2);
  return sign + hours + delimiter + minutes;
}

// node_modules/date-fns/_lib/format/longFormatters.js
var dateLongFormatter = (pattern, formatLong2) => {
  switch (pattern) {
    case "P":
      return formatLong2.date({ width: "short" });
    case "PP":
      return formatLong2.date({ width: "medium" });
    case "PPP":
      return formatLong2.date({ width: "long" });
    case "PPPP":
    default:
      return formatLong2.date({ width: "full" });
  }
};
var timeLongFormatter = (pattern, formatLong2) => {
  switch (pattern) {
    case "p":
      return formatLong2.time({ width: "short" });
    case "pp":
      return formatLong2.time({ width: "medium" });
    case "ppp":
      return formatLong2.time({ width: "long" });
    case "pppp":
    default:
      return formatLong2.time({ width: "full" });
  }
};
var dateTimeLongFormatter = (pattern, formatLong2) => {
  const matchResult = pattern.match(/(P+)(p+)?/) || [];
  const datePattern = matchResult[1];
  const timePattern = matchResult[2];
  if (!timePattern) {
    return dateLongFormatter(pattern, formatLong2);
  }
  let dateTimeFormat;
  switch (datePattern) {
    case "P":
      dateTimeFormat = formatLong2.dateTime({ width: "short" });
      break;
    case "PP":
      dateTimeFormat = formatLong2.dateTime({ width: "medium" });
      break;
    case "PPP":
      dateTimeFormat = formatLong2.dateTime({ width: "long" });
      break;
    case "PPPP":
    default:
      dateTimeFormat = formatLong2.dateTime({ width: "full" });
      break;
  }
  return dateTimeFormat.replace("{{date}}", dateLongFormatter(datePattern, formatLong2)).replace("{{time}}", timeLongFormatter(timePattern, formatLong2));
};
var longFormatters = {
  p: timeLongFormatter,
  P: dateTimeLongFormatter
};

// node_modules/date-fns/_lib/protectedTokens.js
var dayOfYearTokenRE = /^D+$/;
var weekYearTokenRE = /^Y+$/;
var throwTokens = ["D", "DD", "YY", "YYYY"];
function isProtectedDayOfYearToken(token) {
  return dayOfYearTokenRE.test(token);
}
function isProtectedWeekYearToken(token) {
  return weekYearTokenRE.test(token);
}
function warnOrThrowProtectedError(token, format2, input) {
  const _message = message(token, format2, input);
  console.warn(_message);
  if (throwTokens.includes(token)) throw new RangeError(_message);
}
function message(token, format2, input) {
  const subject = token[0] === "Y" ? "years" : "days of the month";
  return `Use \`${token.toLowerCase()}\` instead of \`${token}\` (in \`${format2}\`) for formatting ${subject} to the input \`${input}\`; see: https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md`;
}

// node_modules/date-fns/format.js
var formattingTokensRegExp = /[yYQqMLwIdDecihHKkms]o|(\w)\1*|''|'(''|[^'])+('|$)|./g;
var longFormattingTokensRegExp = /P+p+|P+|p+|''|'(''|[^'])+('|$)|./g;
var escapedStringRegExp = /^'([^]*?)'?$/;
var doubleQuoteRegExp = /''/g;
var unescapedLatinCharacterRegExp = /[a-zA-Z]/;
function format(date, formatStr, options) {
  const defaultOptions2 = getDefaultOptions();
  const locale = options?.locale ?? defaultOptions2.locale ?? enUS;
  const firstWeekContainsDate = options?.firstWeekContainsDate ?? options?.locale?.options?.firstWeekContainsDate ?? defaultOptions2.firstWeekContainsDate ?? defaultOptions2.locale?.options?.firstWeekContainsDate ?? 1;
  const weekStartsOn = options?.weekStartsOn ?? options?.locale?.options?.weekStartsOn ?? defaultOptions2.weekStartsOn ?? defaultOptions2.locale?.options?.weekStartsOn ?? 0;
  const originalDate = toDate(date, options?.in);
  if (!isValid(originalDate)) {
    throw new RangeError("Invalid time value");
  }
  let parts = formatStr.match(longFormattingTokensRegExp).map((substring) => {
    const firstCharacter = substring[0];
    if (firstCharacter === "p" || firstCharacter === "P") {
      const longFormatter = longFormatters[firstCharacter];
      return longFormatter(substring, locale.formatLong);
    }
    return substring;
  }).join("").match(formattingTokensRegExp).map((substring) => {
    if (substring === "''") {
      return { isToken: false, value: "'" };
    }
    const firstCharacter = substring[0];
    if (firstCharacter === "'") {
      return { isToken: false, value: cleanEscapedString(substring) };
    }
    if (formatters[firstCharacter]) {
      return { isToken: true, value: substring };
    }
    if (firstCharacter.match(unescapedLatinCharacterRegExp)) {
      throw new RangeError(
        "Format string contains an unescaped latin alphabet character `" + firstCharacter + "`"
      );
    }
    return { isToken: false, value: substring };
  });
  if (locale.localize.preprocessor) {
    parts = locale.localize.preprocessor(originalDate, parts);
  }
  const formatterOptions = {
    firstWeekContainsDate,
    weekStartsOn,
    locale
  };
  return parts.map((part) => {
    if (!part.isToken) return part.value;
    const token = part.value;
    if (!options?.useAdditionalWeekYearTokens && isProtectedWeekYearToken(token) || !options?.useAdditionalDayOfYearTokens && isProtectedDayOfYearToken(token)) {
      warnOrThrowProtectedError(token, formatStr, String(date));
    }
    const formatter = formatters[token[0]];
    return formatter(originalDate, token, locale.localize, formatterOptions);
  }).join("");
}
function cleanEscapedString(input) {
  const matched = input.match(escapedStringRegExp);
  if (!matched) {
    return input;
  }
  return matched[1].replace(doubleQuoteRegExp, "'");
}

// src/utils/dates.js
function getNowLocal() {
  return /* @__PURE__ */ new Date();
}
function getTodayDateStringLocal() {
  return format(getNowLocal(), "yyyy-MM-dd");
}

// src/utils/ensembleMembership.js
function toIsoDateString(d) {
  if (d == null || d === "") return null;
  const s = typeof d === "string" ? d : String(d);
  return s.length >= 10 ? s.slice(0, 10) : s;
}
function membershipActiveOnProgramDate(row, refDate) {
  const ref = toIsoDateString(refDate);
  const from = toIsoDateString(row?.fecha_desde);
  const until = row?.fecha_hasta != null ? toIsoDateString(row.fecha_hasta) : null;
  if (!ref || !from) return false;
  if (from > ref) return false;
  if (until != null && until < ref) return false;
  return true;
}
function filterMembershipRowsForProgramDate(rows, refDate) {
  if (!rows?.length) return [];
  return rows.filter((r) => membershipActiveOnProgramDate(r, refDate));
}
function programEffectiveDateRange(fechaDesde, fechaHasta) {
  const progStart = toIsoDateString(fechaDesde ?? getTodayDateStringLocal());
  const progEnd = toIsoDateString(
    fechaHasta ?? fechaDesde ?? getTodayDateStringLocal()
  );
  return { progStart, progEnd };
}
function integranteActiveOnProgramRange(person, fechaDesde, fechaHasta) {
  const { progStart, progEnd } = programEffectiveDateRange(
    fechaDesde,
    fechaHasta
  );
  if (!progStart || !progEnd) return true;
  const alta = person?.fecha_alta != null ? toIsoDateString(person.fecha_alta) : null;
  const baja = person?.fecha_baja != null ? toIsoDateString(person.fecha_baja) : null;
  const startsBeforeEnd = !alta || alta <= progEnd;
  const endsAfterStart = !baja || baja >= progStart;
  return startsBeforeEnd && endsAfterStart;
}

// src/utils/participantesSort.js
function isProduccionParticipanteLabel(name) {
  const n = String(name || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return n === "produccion" || n === "prod" || n === "prod.";
}

// src/utils/dietOptions.js
var CANONICAL_STANDARD_DIET = "Est\xE1ndar";
var FIMBA_REGULAR_DIET = "Regular";
function foldDietKey(value) {
  return String(value || "").trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
var DIET_SHORT_LABELS = {
  [CANONICAL_STANDARD_DIET]: "Est\xE1ndar",
  general: "Est\xE1ndar",
  "Sin Lactosa": "s/Lact.",
  "Sin Sal": "s/sal",
  "Sin TACC": "s/TACC",
  [FIMBA_REGULAR_DIET]: "Regular",
  Cel\u00EDaca: "Cel\xED.",
  Cel\u00EDaco: "Cel\xED.",
  Diab\u00E9tica: "Diab.",
  Vegetariana: "Veget.",
  Vegetariano: "Veget.",
  Vegana: "Vegana",
  Vegano: "Vegano",
  Otros: "Otros",
  "Artistas FIMBA": "Art."
};
var SHORT_BY_KEY = new Map(
  Object.entries(DIET_SHORT_LABELS).map(([k, v]) => [foldDietKey(k), v])
);

// src/utils/mealLogistics.js
var MEAL_SERVICE_ORDER = {
  Desayuno: 0,
  Almuerzo: 1,
  Merienda: 2,
  Cena: 3,
  Catering: 4
};
var MEAL_SLOT_SERVICES = Object.freeze([
  "Desayuno",
  "Almuerzo",
  "Merienda",
  "Cena"
]);
var MEAL_PAX_AFFECTING_FIELDS = Object.freeze([
  "convocados",
  "selectedGrupos",
  "propuestas",
  "id_locacion",
  "fecha",
  "hora_inicio",
  "id_tipo_evento",
  "servicio"
]);
var MEAL_ARTIST_COVERAGE_REQUIRED = Object.freeze([
  "Almuerzo",
  "Merienda",
  "Cena"
]);

// src/utils/giraTramos.js
var DEFAULT_DAY_START = "00:00:00";
var DEFAULT_DAY_END = "23:59:59";
function sliceTime(value) {
  if (value == null || value === "") return null;
  const s = String(value);
  return s.length >= 5 ? s.slice(0, 5) : s;
}
function toInstantKey(fecha, hora, { endOfDay = false } = {}) {
  if (!fecha) return null;
  const day = String(fecha).slice(0, 10);
  const t = sliceTime(hora) || (endOfDay ? "23:59" : "00:00");
  return `${day}T${t}`;
}
function compareInstantKeys(a, b) {
  if (a == null || b == null) return 0;
  return a.localeCompare(b);
}
function buildSegmentSpecs(gira, cortes = []) {
  const fechaDesde = gira?.fecha_desde;
  const fechaHasta = gira?.fecha_hasta;
  if (!fechaDesde || !fechaHasta) return [];
  const sorted = [...cortes || []].sort(
    (a, b) => (a.orden ?? 0) - (b.orden ?? 0)
  );
  const count = sorted.length + 1;
  const specs = [];
  for (let i = 0; i < count; i++) {
    const prevCut = i > 0 ? sorted[i - 1] : null;
    const nextCut = i < sorted.length ? sorted[i] : null;
    specs.push({
      indice: i,
      fecha_desde: i === 0 ? fechaDesde : prevCut.fecha,
      fecha_hasta: i === count - 1 ? fechaHasta : nextCut.fecha,
      instant_desde: toInstantKey(
        i === 0 ? fechaDesde : prevCut.fecha,
        i === 0 ? DEFAULT_DAY_START : prevCut.hora
      ),
      instant_hasta: i === count - 1 ? toInstantKey(fechaHasta, DEFAULT_DAY_END, { endOfDay: true }) : toInstantKey(nextCut.fecha, nextCut.hora),
      corte_entrada: prevCut,
      corte_salida: nextCut
    });
  }
  return specs;
}
function buildSegments(gira, cortes = [], localidadesByIndice = {}) {
  return buildSegmentSpecs(gira, cortes).map((spec) => ({
    ...spec,
    localidadIds: (localidadesByIndice[spec.indice] || []).map(Number).filter(Boolean)
  }));
}
function resolveActiveSegment(segments, fecha, hora = null) {
  if (!segments?.length || !fecha) return null;
  const instant = toInstantKey(fecha, hora ?? "12:00");
  if (!instant) return null;
  for (const seg of segments) {
    const start = seg.instant_desde;
    const end = seg.instant_hasta;
    if (!start || !end) continue;
    if (compareInstantKeys(instant, start) >= 0 && compareInstantKeys(instant, end) < 0) {
      return seg;
    }
  }
  const last = segments[segments.length - 1];
  if (last && compareInstantKeys(instant, last.instant_desde) >= 0 && compareInstantKeys(instant, last.instant_hasta) <= 0) {
    return last;
  }
  return segments[0] ?? null;
}
function resolveLocalidadIdsFromPerson(person) {
  const ids = collectPersonLocalidadIds(person);
  return ids[0] ?? null;
}
function normalizePersonForLocalCheck(person) {
  if (!person) return person;
  const nested = person.integrantes || person.integrante;
  if (!nested || nested === person) return person;
  return {
    ...nested,
    ...person,
    id_loc_viaticos: person.id_loc_viaticos ?? nested.id_loc_viaticos,
    id_localidad: person.id_localidad ?? nested.id_localidad,
    id_localidad_residencia: person.id_localidad_residencia ?? nested.id_localidad,
    id_domicilio_laboral: person.id_domicilio_laboral ?? nested.id_domicilio_laboral,
    viaticos: person.viaticos ?? nested.viaticos,
    residencia: person.residencia ?? nested.residencia,
    laboral: person.laboral ?? nested.laboral,
    localidades: person.localidades ?? nested.localidades,
    localidades_residencia: person.localidades_residencia ?? nested.localidades_residencia,
    _loc_viaticos: person._loc_viaticos ?? nested._loc_viaticos,
    _loc_residencia: person._loc_residencia ?? nested._loc_residencia
  };
}
function collectPersonLocalidadIds(person) {
  const set = /* @__PURE__ */ new Set();
  const add = (value) => {
    if (value == null || value === "") return;
    const n = Number(value);
    if (!Number.isNaN(n) && n > 0) set.add(n);
  };
  const p = normalizePersonForLocalCheck(person);
  add(resolveLocalidadEfectivaViaticos(p)?.id);
  add(resolveLocalidadResidencia(p)?.id);
  add(p?.id_loc_viaticos);
  add(p?.id_localidad);
  add(p?.id_localidad_residencia);
  add(p?.localidades?.id);
  add(p?.localidades_residencia?.id);
  add(p?._loc_viaticos?.id);
  add(p?._loc_residencia?.id);
  return [...set];
}
function personMatchesLocalidadIds(person, localidadIds) {
  if (!localidadIds?.length) return false;
  const personIds = collectPersonLocalidadIds(person);
  if (!personIds.length) return false;
  const tramoIds = localidadIds.map((id) => Number(id)).filter((id) => id > 0);
  return personIds.some((pid) => tramoIds.includes(pid));
}
function isLocalAt(person, instant, segments) {
  if (!segments?.length) return false;
  const { fecha, hora } = normalizeInstant(instant);
  const seg = resolveActiveSegment(segments, fecha, hora);
  if (!seg) {
    return segments.some(
      (s) => personMatchesLocalidadIds(person, s.localidadIds)
    );
  }
  return personMatchesLocalidadIds(person, seg.localidadIds);
}
function isLocalInAnySegment(person, segments) {
  if (!segments?.length) return false;
  return segments.some(
    (s) => personMatchesLocalidadIds(person, s.localidadIds)
  );
}
function isLocalLegacy(person, tourLocSet) {
  const locId = resolveLocalidadIdsFromPerson(person);
  if (locId == null) return false;
  return tourLocSet.has(locId);
}
function resolvePersonIsLocal(person, { segments, tourLocSet, cortesCount = 0 }) {
  if (cortesCount > 0 && segments?.length) {
    return isLocalInAnySegment(person, segments);
  }
  if (segments?.length === 1) {
    return isLocalAt(
      person,
      { fecha: segments[0].fecha_desde, hora: "12:00" },
      segments
    );
  }
  return isLocalLegacy(person, tourLocSet ?? /* @__PURE__ */ new Set());
}
function normalizeInstant(instant) {
  if (!instant) return { fecha: null, hora: null };
  if (typeof instant === "string") {
    const [fecha, timePart] = instant.split("T");
    return { fecha, hora: sliceTime(timePart) };
  }
  if (instant.fecha && instant.servicio) {
    return mealSlotToInstant(instant.fecha, instant.servicio);
  }
  return {
    fecha: instant.fecha || instant.date,
    hora: sliceTime(instant.hora || instant.time || "12:00")
  };
}
function mealSlotToInstant(fecha, servicio) {
  const order = MEAL_SERVICE_ORDER[servicio] ?? 1;
  const horaBySlot = ["08:00", "13:00", "17:00", "21:00"];
  return { fecha: String(fecha).slice(0, 10), hora: horaBySlot[order] ?? "12:00" };
}

// src/utils/giraUtils.js
var normalize = (str) => (str || "").toLowerCase().trim();
var DEFAULT_ROL_ID = "musico";
var ROLE_MUS_PROD = "mus_prod";
var getInstrumentRel = (member) => {
  const rel = member?.instrumentos;
  if (Array.isArray(rel)) return rel[0] ?? null;
  return rel ?? null;
};
var resolveInstrumentFromCatalog = (instrumentId, catalog = []) => {
  if (instrumentId == null || String(instrumentId).trim() === "") return null;
  const key = String(instrumentId).trim();
  const list = Array.isArray(catalog) ? catalog : [];
  return list.find((row) => String(row.id) === key) ?? null;
};
var applyEffectiveGiraInstrument = (member, giraOverrideId, instrumentCatalog = []) => {
  const idInstrPerfil = member?.id_instr ?? null;
  const idInstrGiraOverride = giraOverrideId != null && String(giraOverrideId).trim() !== "" ? String(giraOverrideId).trim() : null;
  const effectiveId = idInstrGiraOverride ?? idInstrPerfil;
  const profileInstrument = getInstrumentRel(member);
  const catalogRow = resolveInstrumentFromCatalog(effectiveId, instrumentCatalog);
  const effectiveInstrument = catalogRow ? {
    instrumento: catalogRow.instrumento,
    familia: catalogRow.familia,
    abreviatura: catalogRow.abreviatura ?? profileInstrument?.abreviatura ?? null,
    plaza_extra: catalogRow.plaza_extra ?? profileInstrument?.plaza_extra ?? null,
    rol_gira_default: catalogRow.rol_gira_default ?? profileInstrument?.rol_gira_default ?? null
  } : profileInstrument;
  return {
    ...member,
    id_instr_perfil: idInstrPerfil,
    id_instr_gira_override: idInstrGiraOverride,
    id_instr: effectiveId,
    instrumentos: effectiveInstrument
  };
};
var getInstrumentDefaultTourRoleFromMember = (member) => {
  const roleId = getInstrumentRel(member)?.rol_gira_default;
  if (roleId == null || String(roleId).trim() === "") return null;
  return String(roleId).trim();
};
var ensembleNameFromRel = (ensRel) => {
  const rel = Array.isArray(ensRel) ? ensRel[0] : ensRel;
  if (typeof rel === "string") return rel;
  return rel?.ensamble ?? "";
};
var getMemberEnsembleNames = (member) => {
  const names = [];
  const rows = Array.isArray(member?.integrantes_ensambles) ? member.integrantes_ensambles : [];
  for (const row of rows) {
    const fromJoin = ensembleNameFromRel(row?.ensambles);
    if (fromJoin) names.push(fromJoin);
    else if (typeof row?.ensamble === "string" && row.ensamble.trim()) {
      names.push(row.ensamble);
    }
  }
  const flat = Array.isArray(member?.ensambles) ? member.ensambles : [];
  for (const entry of flat) {
    const name = ensembleNameFromRel(entry);
    if (name) names.push(name);
  }
  return names;
};
var hasProductionEnsemble = (member) => getMemberEnsembleNames(member).some(
  (name) => isProduccionParticipanteLabel(name)
);
var hasMusicianEnsemble = (member) => getMemberEnsembleNames(member).some(
  (name) => String(name).trim() !== "" && !isProduccionParticipanteLabel(name)
);
var inferDefaultTourRole = (member) => {
  if (hasProductionEnsemble(member) && hasMusicianEnsemble(member)) {
    return ROLE_MUS_PROD;
  }
  const fromInstrument = getInstrumentDefaultTourRoleFromMember(member);
  if (fromInstrument) return fromInstrument;
  if (hasProductionEnsemble(member)) return "produccion";
  return DEFAULT_ROL_ID;
};
var resolveTourRoleOverride = (manualRole, member, fallbackRole) => {
  const normalizedManualRole = normalize(manualRole);
  const inferred = fallbackRole || inferDefaultTourRole(member);
  if (!normalizedManualRole) return inferred;
  if (normalizedManualRole === DEFAULT_ROL_ID && inferred !== DEFAULT_ROL_ID) {
    return inferred;
  }
  return manualRole;
};
var ROLES_CATEGORIA_LOGISTICA_PRODUCCION = Object.freeze([
  "produccion",
  "chofer",
  "mus_prod"
]);
var ROLES_CATEGORIA_LOGISTICA_PRODUCCION_SET = new Set(
  ROLES_CATEGORIA_LOGISTICA_PRODUCCION
);
var LOGISTICS_MATCH_STRENGTH = Object.freeze({
  PERSONA: 5,
  ENSAMBLE: 4,
  CATEGORIA: 3,
  LOCALIDAD: 2,
  CATCH_ALL: 1,
  NONE: 0
});

// src/services/giraSegmentosService.js
var SEGMENTO_SELECT = `
  id,
  indice,
  fecha_desde,
  fecha_hasta,
  giras_tramo_localidades(id_localidad, localidades(id, localidad))
`;
var CORTES_SELECT = `
  id,
  id_gira,
  orden,
  fecha,
  hora,
  fecha_checkout,
  hora_checkout,
  fecha_checkin,
  hora_checkin,
  id_evento
`;
function mapSegmentRows(rows) {
  const localidadesByIndice = {};
  (rows || []).forEach((row) => {
    localidadesByIndice[row.indice] = (row.giras_tramo_localidades || []).map((l) => Number(l.id_localidad)).filter((id) => !Number.isNaN(id));
  });
  return localidadesByIndice;
}
async function fetchGiraSegmentosBundle(supabase, giraId, gira = null) {
  if (!giraId) {
    return { cortes: [], segmentRows: [], segments: [], cortesCount: 0 };
  }
  let programa = gira;
  if (!programa?.fecha_desde || !programa?.fecha_hasta) {
    const { data } = await supabase.from("programas").select("id, fecha_desde, fecha_hasta").eq("id", giraId).maybeSingle();
    programa = data ?? programa;
  }
  const [cortesRes, segmentosRes] = await Promise.all([
    supabase.from("giras_tramo_cortes").select(CORTES_SELECT).eq("id_gira", giraId).order("orden"),
    supabase.from("giras_tramo_segmentos").select(SEGMENTO_SELECT).eq("id_gira", giraId).order("indice")
  ]);
  if (cortesRes.error) throw cortesRes.error;
  if (segmentosRes.error) throw segmentosRes.error;
  const cortes = cortesRes.data || [];
  const segmentRows = segmentosRes.data || [];
  const localidadesByIndice = mapSegmentRows(segmentRows);
  const segments = buildSegments(programa, cortes, localidadesByIndice);
  return {
    cortes,
    segmentRows,
    segments,
    cortesCount: cortes.length,
    programa
  };
}

// src/hooks/useGiraRoster.js
var INTEGRANTES_SELECT_FULL = `id, nombre, apellido, nombre_preferencia, apellido_preferencia, fecha_alta, fecha_baja, condicion, telefono, mail, alimentacion, es_simulacion, id_instr,
           id_localidad, id_loc_viaticos, id_domicilio_laboral, documentacion, docred, firma, nota_interna, cargo, jornada, motivo,
           dni, fecha_nac, genero, cuil,
           link_dni_img, link_cuil, link_cbu_img, link_declaracion, link_carnet,
           instrumentos(instrumento, familia, abreviatura, plaza_extra, rol_gira_default),
           residencia:localidades!id_localidad(id, localidad, id_region, regiones(region)),
           viaticos:localidades!id_loc_viaticos(id, localidad, id_region, regiones(region)),
           integrantes_ensambles(id, id_ensamble, fecha_desde, fecha_hasta, ensambles(id, ensamble))`;
var INTEGRANTES_SELECT_LITE = `id, nombre, apellido, nombre_preferencia, apellido_preferencia, fecha_alta, fecha_baja, es_simulacion, id_instr, mail,
           instrumentos(instrumento, familia, abreviatura, rol_gira_default),
           integrantes_ensambles(id, id_ensamble, fecha_desde, fecha_hasta, ensambles(id, ensamble))`;
async function fetchRosterForGira(supabase, gira, options = {}) {
  const {
    instrumentCatalog: cachedCatalog = null,
    lite = false,
    fuentesOverride = null,
    integrantesOverride = null
  } = options;
  if (!gira?.id) return { roster: [], sources: [] };
  let programRefDesde = gira.fecha_desde ?? null;
  if (!programRefDesde) {
    const { data: prog } = await supabase.from("programas").select("fecha_desde").eq("id", gira.id).maybeSingle();
    programRefDesde = prog?.fecha_desde ?? null;
  }
  if (!programRefDesde) {
    programRefDesde = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  }
  let fuentes;
  if (fuentesOverride != null) {
    fuentes = fuentesOverride;
  } else {
    const { data, error: errFuentes } = await supabase.from("giras_fuentes").select("*").eq("id_gira", gira.id);
    if (errFuentes) throw errFuentes;
    fuentes = data;
  }
  const inclEnsembles = /* @__PURE__ */ new Set();
  const inclFamilies = /* @__PURE__ */ new Set();
  const exclEnsembles = /* @__PURE__ */ new Set();
  fuentes?.forEach((f) => {
    if (f.tipo === "ENSAMBLE") inclEnsembles.add(Number(f.valor_id));
    if (f.tipo === "FAMILIA") inclFamilies.add(f.valor_texto);
    if (f.tipo === "EXCL_ENSAMBLE") exclEnsembles.add(Number(f.valor_id));
  });
  let overrides;
  if (integrantesOverride != null) {
    overrides = integrantesOverride;
  } else {
    const { data, error: errOverrides } = await supabase.from("giras_integrantes").select("*").eq("id_gira", gira.id);
    if (errOverrides) throw errOverrides;
    overrides = data;
  }
  let instrumentCatalog = cachedCatalog;
  if (!instrumentCatalog) {
    const { data, error: errCatalog } = await supabase.from("instrumentos").select("id, instrumento, familia, abreviatura, plaza_extra, rol_gira_default");
    if (errCatalog) throw errCatalog;
    instrumentCatalog = data;
  }
  const overrideMap = {};
  overrides?.forEach((o) => {
    const kid = integranteKey(o.id_integrante);
    if (!kid) return;
    overrideMap[kid] = {
      estado: o.estado,
      rol: o.rol,
      id_instr: o.id_instr ?? null,
      motivo_estado: o.motivo_estado ?? null,
      motivo_estado_actualizado_at: o.motivo_estado_actualizado_at ?? null,
      abona_reemplazo: Boolean(o.abona_reemplazo),
      abona_licencia: Boolean(o.abona_licencia)
    };
  });
  const [rowsEns, membersFam, rowsExcl] = await Promise.all([
    inclEnsembles.size > 0 ? supabase.from("integrantes_ensambles").select("id_integrante, id_ensamble, fecha_desde, fecha_hasta").in("id_ensamble", Array.from(inclEnsembles)).then((res) => res.data || []) : Promise.resolve([]),
    inclFamilies.size > 0 ? supabase.from("integrantes").select("id, instrumentos!inner(familia)").eq("condicion", "Estable").in("instrumentos.familia", Array.from(inclFamilies)).then((res) => res.data || []) : Promise.resolve([]),
    exclEnsembles.size > 0 ? supabase.from("integrantes_ensambles").select("id_integrante, id_ensamble, fecha_desde, fecha_hasta").in("id_ensamble", Array.from(exclEnsembles)).then((res) => res.data || []) : Promise.resolve([])
  ]);
  const membersEns = rowsEns.filter(
    (r) => inclEnsembles.has(Number(r.id_ensamble)) && membershipActiveOnProgramDate(r, programRefDesde)
  );
  const membersExcl = rowsExcl.filter(
    (r) => exclEnsembles.has(Number(r.id_ensamble)) && membershipActiveOnProgramDate(r, programRefDesde)
  );
  const baseIncludedIds = /* @__PURE__ */ new Set([
    ...membersEns.map((m) => integranteKey(m.id_integrante)),
    ...membersFam.map((m) => integranteKey(m.id))
  ]);
  const excludedIds = new Set(
    membersExcl.map((m) => integranteKey(m.id_integrante))
  );
  const manualIds = new Set(
    (overrides || []).map((o) => integranteKey(o.id_integrante)).filter(Boolean)
  );
  const allPotentialIds = /* @__PURE__ */ new Set([
    ...baseIncludedIds,
    ...excludedIds,
    ...manualIds
  ]);
  const allIds = Array.from(allPotentialIds).filter(Boolean);
  if (allIds.length === 0) return { roster: [], sources: fuentes || [] };
  const chunkSize = 20;
  const chunks = [];
  for (let i = 0; i < allIds.length; i += chunkSize) chunks.push(allIds.slice(i, i + chunkSize));
  const integrantesSelect = lite ? INTEGRANTES_SELECT_LITE : INTEGRANTES_SELECT_FULL;
  const musiciansResults = await Promise.all(
    chunks.map(
      (chunk) => supabase.from("integrantes").select(integrantesSelect).in(
        "id",
        chunk.map((k) => Number.isSafeInteger(Number(k)) ? Number(k) : k)
      )
    )
  );
  let musicians = [];
  for (const res of musiciansResults) {
    if (res.error) throw res.error;
    if (res.data) musicians = [...musicians, ...res.data];
  }
  let tourLocSet = /* @__PURE__ */ new Set();
  let segmentBundle = { segments: [], cortesCount: 0 };
  if (!lite) {
    const { data: tourLocs } = await supabase.from("giras_localidades").select("id_localidad").eq("id_gira", gira.id);
    tourLocSet = new Set(tourLocs?.map((l) => l.id_localidad));
    try {
      segmentBundle = await fetchGiraSegmentosBundle(supabase, gira.id, gira);
    } catch (segmentErr) {
      console.warn("fetchGiraSegmentosBundle:", segmentErr?.message);
    }
  }
  const finalRoster = [];
  musicians.forEach((m) => {
    const id = integranteKey(m.id);
    const manualData = overrideMap[id];
    const isManual = manualIds.has(id);
    const isExcluded = excludedIds.has(id);
    const isBaseIncluded = baseIncludedIds.has(id);
    const ieForProgram = filterMembershipRowsForProgramDate(
      m.integrantes_ensambles,
      programRefDesde
    );
    const processedMember = lite ? {
      ...m,
      nombre_completo: seatingApellidoNombre(m),
      integrantes_ensambles: ieForProgram,
      ensambles: ieForProgram.map((ie) => ie.ensambles).filter(Boolean)
    } : (() => {
      const locEfectiva = resolveLocalidadEfectivaViaticos(m);
      const localidadEfectiva = locEfectiva.objeto;
      return {
        ...m,
        localidades: localidadEfectiva,
        nombre_completo: seatingApellidoNombre(m),
        _loc_residencia: m.residencia,
        _loc_viaticos: m.viaticos,
        integrantes_ensambles: ieForProgram,
        ensambles: ieForProgram.map((ie) => ie.ensambles).filter(Boolean)
      };
    })();
    let keep = false;
    let estadoReal = "confirmado";
    let rolReal = inferDefaultTourRole({
      ...m,
      integrantes_ensambles: ieForProgram
    });
    let esAdicional = false;
    let isBaseValid = false;
    if (isBaseIncluded && !isExcluded) {
      isBaseValid = integranteActiveOnProgramRange(
        m,
        gira.fecha_desde,
        gira.fecha_hasta
      );
    }
    if (isManual) {
      estadoReal = manualData?.estado ?? "confirmado";
      rolReal = resolveTourRoleOverride(
        manualData?.rol,
        {
          ...m,
          integrantes_ensambles: ieForProgram
        },
        rolReal
      );
      keep = true;
      esAdicional = isBaseValid ? false : estadoReal === "confirmado";
    } else if (isExcluded) {
      keep = false;
    } else {
      if (isBaseValid) {
        keep = true;
        estadoReal = "confirmado";
      }
    }
    if (keep) {
      const isLocal = lite ? false : resolvePersonIsLocal(processedMember, {
        segments: segmentBundle.segments,
        tourLocSet,
        cortesCount: segmentBundle.cortesCount
      });
      const enGirasIntegrantes = manualIds.has(id);
      const withEffectiveInstrument = applyEffectiveGiraInstrument(
        processedMember,
        manualData?.id_instr ?? null,
        instrumentCatalog || []
      );
      finalRoster.push({
        ...withEffectiveInstrument,
        estado_gira: estadoReal,
        rol_gira: rolReal,
        es_adicional: esAdicional,
        is_local: isLocal,
        en_giras_integrantes: enGirasIntegrantes,
        ...enGirasIntegrantes && manualData ? {
          motivo_estado: manualData.motivo_estado ?? null,
          motivo_estado_actualizado_at: manualData.motivo_estado_actualizado_at ?? null,
          abona_reemplazo: Boolean(manualData.abona_reemplazo),
          abona_licencia: Boolean(manualData.abona_licencia)
        } : {
          motivo_estado: null,
          motivo_estado_actualizado_at: null,
          abona_reemplazo: false,
          abona_licencia: false
        }
      });
    }
  });
  const sorted = finalRoster.sort((a, b) => {
    if (a.estado_gira === "ausente" && b.estado_gira !== "ausente") return 1;
    if (a.estado_gira !== "ausente" && b.estado_gira === "ausente") return -1;
    const rolesPrio = {
      director: 1,
      solista: 2,
      musico: 3,
      mus_prod: 4,
      produccion: 4,
      staff: 5,
      chofer: 6
    };
    const pA = rolesPrio[a.rol_gira] || 99;
    const pB = rolesPrio[b.rol_gira] || 99;
    if (pA !== pB) return pA - pB;
    return (a.apellido || "").localeCompare(b.apellido || "");
  });
  return { roster: sorted, sources: fuentes || [] };
}

// src/utils/instrumentation.js
function countsTowardInstrumentationConvoked(rolGira) {
  const r = String(rolGira || "musico").toLowerCase().trim();
  return r === "musico" || r === "mus_prod";
}

// src/utils/organicoConvocado.js
var ORGANICO_KEYS = [
  "Fl",
  "Ob",
  "Cl",
  "Fg",
  "Cr",
  "Tp",
  "Tb",
  "Tba",
  "Tim",
  "Perc",
  "Har",
  "Pno",
  "Str"
];
function createEmptyOrganicoMap() {
  return {
    Fl: 0,
    Ob: 0,
    Cl: 0,
    Fg: 0,
    Cr: 0,
    Tp: 0,
    Tb: 0,
    Tba: 0,
    Tim: 0,
    Perc: 0,
    Har: 0,
    Pno: 0,
    Str: 0
  };
}
function computeConvoked(roster) {
  const acc = createEmptyOrganicoMap();
  if (!roster || roster.length === 0) return acc;
  roster.forEach((m) => {
    if (m.estado_gira === "ausente") return;
    if (!countsTowardInstrumentationConvoked(m.rol_gira)) return;
    const idInstr = String(m.id_instr || "");
    const name = (m.instrumentos?.instrumento || "").toLowerCase();
    const familia = (m.instrumentos?.familia || "").toLowerCase();
    const add = (key) => {
      acc[key] += 1;
    };
    if (["01", "02", "03", "04"].includes(idInstr)) {
      add("Str");
      return;
    }
    if (name.includes("flaut") || name.includes("picc")) {
      add("Fl");
      return;
    }
    if (name.includes("oboe") || name.includes("corno ing")) {
      add("Ob");
      return;
    }
    if (name.includes("clarin") || name.includes("requinto") || name.includes("basset")) {
      add("Cl");
      return;
    }
    if (name.includes("fagot") || name.includes("contraf")) {
      add("Fg");
      return;
    }
    if (name.includes("corno") || name.includes("trompa")) {
      add("Cr");
      return;
    }
    if (name.includes("trompet") || name.includes("fliscorno")) {
      add("Tp");
      return;
    }
    if (name.includes("trombon") || name.includes("tromb\xF3n")) {
      add("Tb");
      return;
    }
    if (name.includes("tuba") || name.includes("bombard")) {
      add("Tba");
      return;
    }
    if (name.includes("timbal")) {
      add("Tim");
      return;
    }
    if (name.includes("perc") || name.includes("bombo") || name.includes("platillo") || name.includes("caja")) {
      add("Perc");
      return;
    }
    if (name.includes("arpa")) {
      add("Har");
      return;
    }
    if (name.includes("piano") || name.includes("teclado") || name.includes("celesta") || name.includes("\xF3rgano") || name.includes("organo")) {
      add("Pno");
      return;
    }
    if (familia.includes("cuerd")) {
      add("Str");
    }
  });
  return acc;
}
function normalizeOrganicoMap(value) {
  const acc = createEmptyOrganicoMap();
  if (!value || typeof value !== "object") return acc;
  ORGANICO_KEYS.forEach((key) => {
    const n = Number(value[key]);
    acc[key] = Number.isFinite(n) ? n : 0;
  });
  return acc;
}
function organicoMapsEqual(a, b) {
  const left = normalizeOrganicoMap(a);
  const right = normalizeOrganicoMap(b);
  return ORGANICO_KEYS.every((key) => left[key] === right[key]);
}
function formatInstrumentationStandard(map) {
  const source = map || createEmptyOrganicoMap();
  const fl = source.Fl || 0;
  const ob = source.Ob || 0;
  const cl = source.Cl || 0;
  const bn = source.Fg || 0;
  const hn = source.Cr || 0;
  const tpt = source.Tp || 0;
  const tbn = source.Tb || 0;
  const tba = source.Tba || 0;
  const percTotal = (source.Tim || 0) + (source.Perc || 0);
  const harpCount = source.Har || 0;
  const keyCount = source.Pno || 0;
  const hasStr = (source.Str || 0) > 0;
  let standardStr = `${fl}.${ob}.${cl}.${bn} - ${hn}.${tpt}.${tbn}.${tba}`;
  let percStr = "";
  if (percTotal === 1) percStr = "Perc";
  else if (percTotal > 1) percStr = `Perc.x${percTotal}`;
  if (percStr) standardStr += ` - ${percStr}`;
  if (harpCount > 0) standardStr += ` - ${harpCount > 1 ? harpCount : ""}Hp`;
  if (keyCount > 0) standardStr += " - Key";
  if (hasStr) standardStr += " - Str";
  const isStandardEmpty = standardStr.startsWith("0.0.0.0 - 0.0.0.0") && percTotal === 0 && !hasStr && harpCount === 0 && keyCount === 0;
  if (isStandardEmpty) return "s/d";
  return standardStr.replace("0.0.0.0 - 0.0.0.0 - ", "").replace("0.0.0.0 - 0.0.0.0", "");
}
function snapshotFromRoster(roster) {
  const map = computeConvoked(roster);
  const formatted = formatInstrumentationStandard(map);
  const text = formatted === "s/d" ? "" : formatted;
  return { text, map };
}

// src/services/organicoConvocadoService.js
var queue = [];
var pendingIds = /* @__PURE__ */ new Set();
var running = 0;
function drainOrganicoQueue() {
  while (running < 2 && queue.length > 0) {
    const job = queue.shift();
    running += 1;
    Promise.resolve().then(job).finally(() => {
      running -= 1;
      drainOrganicoQueue();
    });
  }
}
async function persistOrganicoFromRoster(supabase, programaId, roster) {
  if (!supabase || programaId == null) return null;
  const snap = snapshotFromRoster(roster);
  const { data: current, error: readErr } = await supabase.from("programas").select("organico_convocado, organico_convocado_map").eq("id", programaId).maybeSingle();
  if (readErr) throw readErr;
  const sameText = (current?.organico_convocado || "") === snap.text;
  const sameMap = current?.organico_convocado_map && organicoMapsEqual(current.organico_convocado_map, snap.map);
  if (sameText && sameMap) return snap;
  const { error } = await supabase.from("programas").update({
    organico_convocado: snap.text || null,
    organico_convocado_map: snap.map,
    organico_convocado_at: (/* @__PURE__ */ new Date()).toISOString()
  }).eq("id", programaId);
  if (error) throw error;
  return snap;
}
async function refreshOrganicoConvocado(supabase, gira, options = {}) {
  if (!supabase || !gira?.id) return null;
  const { roster } = await fetchRosterForGira(supabase, gira, {
    lite: true,
    ...options
  });
  return persistOrganicoFromRoster(supabase, gira.id, roster);
}
async function touchOrganicoConvocado(supabase, programaId) {
  if (!supabase || programaId == null) return null;
  const { data, error } = await supabase.from("programas").select("id, fecha_desde, fecha_hasta").eq("id", programaId).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return refreshOrganicoConvocado(supabase, data);
}
function todayArt() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires"
  }).format(/* @__PURE__ */ new Date());
}
function vigenteOrganicoQuery(supabase) {
  const today = todayArt();
  return supabase.from("programas").select("id, fecha_desde, fecha_hasta").or(`fecha_hasta.gte.${today},fecha_hasta.is.null`).order("organico_convocado_at", { ascending: true, nullsFirst: true });
}
async function loadInstrumentCatalog(supabase) {
  const { data, error } = await supabase.from("instrumentos").select("id, instrumento, familia, abreviatura, plaza_extra, rol_gira_default");
  if (error) throw error;
  return data || [];
}
async function listCurrentOrganicoProgramas(supabase) {
  const { data, error } = await vigenteOrganicoQuery(supabase);
  if (error) throw error;
  return data || [];
}
async function refreshOrganicoProgramas(supabase, rows, { onProgress, deadlineMs } = {}) {
  const catalog = await loadInstrumentCatalog(supabase);
  const updated = [];
  const failed = [];
  const list = rows || [];
  for (const row of list) {
    if (deadlineMs && Date.now() >= deadlineMs) break;
    try {
      await refreshOrganicoConvocado(supabase, row, {
        instrumentCatalog: catalog
      });
      updated.push(row.id);
    } catch (err) {
      failed.push({ id: row.id, error: err?.message || String(err) });
    }
    onProgress?.({
      done: updated.length + failed.length,
      total: list.length
    });
  }
  return { updated, failed, total: list.length };
}
async function refreshCurrentOrganicoConvocado(supabase, { limit = 12, deadlineMs, onProgress } = {}) {
  let query = vigenteOrganicoQuery(supabase);
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw error;
  const result = await refreshOrganicoProgramas(supabase, data || [], {
    deadlineMs,
    onProgress
  });
  return { ...result, scanned: (data || []).length };
}
function enqueueOrganicoRefresh(supabase, gira, onDone) {
  const id = gira?.id;
  if (!supabase || id == null || pendingIds.has(id)) return;
  pendingIds.add(id);
  queue.push(async () => {
    try {
      const snap = await refreshOrganicoConvocado(supabase, gira);
      onDone?.(snap);
    } catch (err) {
      console.warn("organico_convocado:", err?.message || err);
      onDone?.(null);
    } finally {
      pendingIds.delete(id);
    }
  });
  drainOrganicoQueue();
}
export {
  enqueueOrganicoRefresh,
  listCurrentOrganicoProgramas,
  persistOrganicoFromRoster,
  refreshCurrentOrganicoConvocado,
  refreshOrganicoConvocado,
  refreshOrganicoProgramas,
  touchOrganicoConvocado
};
