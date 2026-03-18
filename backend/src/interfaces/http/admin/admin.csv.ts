type CsvScalar = string | number | boolean | null | undefined;
type CsvRow = Record<string, CsvScalar>;

function escapeCsvValue(value: CsvScalar): string {
	if (value === null || value === undefined) {
		return "";
	}
	const raw = String(value);
	const escaped = raw.replaceAll('"', "\"\"");
	if (/[",\r\n]/.test(escaped)) {
		return `"${escaped}"`;
	}
	return escaped;
}

export function toCsv(rows: CsvRow[]): string {
	if (rows.length === 0) {
		return "";
	}
	const headers = Object.keys(rows[0] ?? {});
	const lines: string[] = [headers.join(",")];
	for (const row of rows) {
		const values = headers.map(header => escapeCsvValue(row[header]));
		lines.push(values.join(","));
	}
	return `${lines.join("\n")}\n`;
}
