/** Minimal RFC-4180 CSV parser: handles quoted fields, escaped quotes (""),
 *  and commas/newlines inside quotes. Returns rows as arrays of strings. */
export function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length) {
    row.push(field);
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

/** Parse CSV into objects keyed by header, yielding one object per row.
 *  Generator so large files don't materialise an array of objects. */
export function* parseCsvObjects(text) {
  const rows = parseCsvRows(text);
  if (!rows.length) return;
  const header = rows[0];
  for (let r = 1; r < rows.length; r++) {
    const obj = {};
    for (let c = 0; c < header.length; c++) obj[header[c]] = rows[r][c];
    yield obj;
  }
}
