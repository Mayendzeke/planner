import { strFromU8, unzipSync } from "fflate";

export type StudyMaterialPreview =
  | { kind: "text"; text: string }
  | { kind: "slides"; slides: { number: number; title: string; body: string }[] }
  | { kind: "table"; sheetName: string; rows: string[][] }
  | { kind: "unsupported"; message: string };

function xmlDocument(source: string): Document {
  const document = new DOMParser().parseFromString(source, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new Error("The document contains XML that could not be read.");
  return document;
}

function nodeText(node: Element): string {
  return Array.from(node.getElementsByTagNameNS("*", "t")).map(item => item.textContent || "").join("").trim();
}

function wordParagraphs(source: string): string[] {
  const document = xmlDocument(source);
  return Array.from(document.getElementsByTagNameNS("*", "p")).map(nodeText).filter(Boolean);
}

function readZipEntry(zip: Record<string, Uint8Array>, path: string): string {
  const entry = zip[path];
  if (!entry) throw new Error("This Office file is missing a required document part.");
  return strFromU8(entry);
}

function parseCsv(source: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') { cell += '"'; index++; }
      else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(cell); cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index++;
      row.push(cell); cell = "";
      if (row.some(value => value.trim())) rows.push(row);
      row = [];
    } else cell += character;
  }
  row.push(cell);
  if (row.some(value => value.trim())) rows.push(row);
  return rows.slice(0, 100).map(values => values.slice(0, 12));
}

function pptxPreview(zip: Record<string, Uint8Array>): StudyMaterialPreview {
  const slideNames = Object.keys(zip)
    .filter(path => /^ppt\/slides\/slide\d+\.xml$/i.test(path))
    .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] || 0) - Number(b.match(/slide(\d+)/i)?.[1] || 0));
  if (!slideNames.length) return { kind: "unsupported", message: "No readable slides were found. Download the original PowerPoint to open it in a presentation app." };
  const slides = slideNames.slice(0, 60).map((path, index) => {
    const paragraphs = wordParagraphs(readZipEntry(zip, path));
    return { number: index + 1, title: paragraphs[0] || "Slide " + (index + 1), body: paragraphs.slice(1).join("\n") };
  });
  if (!slides.some(slide => slide.title || slide.body)) {
    return { kind: "unsupported", message: "The presentation has no extractable slide text. Download the original file to view its graphics and layout." };
  }
  return { kind: "slides", slides };
}

function xlsxPreview(zip: Record<string, Uint8Array>): StudyMaterialPreview {
  const sheetPath = Object.keys(zip).filter(path => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((a, b) => Number(a.match(/sheet(\d+)/i)?.[1] || 0) - Number(b.match(/sheet(\d+)/i)?.[1] || 0))[0];
  if (!sheetPath) return { kind: "unsupported", message: "No readable worksheet was found. Download the original spreadsheet to open it in Excel or another spreadsheet app." };
  const strings: string[] = [];
  if (zip["xl/sharedStrings.xml"]) {
    const shared = xmlDocument(readZipEntry(zip, "xl/sharedStrings.xml"));
    strings.push(...Array.from(shared.getElementsByTagNameNS("*", "si")).map(nodeText));
  }
  const sheet = xmlDocument(readZipEntry(zip, sheetPath));
  const rows = Array.from(sheet.getElementsByTagNameNS("*", "row")).slice(0, 100).map(rowNode => {
    const row: string[] = [];
    for (const cell of Array.from(rowNode.getElementsByTagNameNS("*", "c"))) {
      const reference = cell.getAttribute("r") || "";
      const letters = reference.match(/^[A-Z]+/i)?.[0] || "";
      let column = 0;
      for (const letter of letters.toUpperCase()) column = column * 26 + letter.charCodeAt(0) - 64;
      column = Math.max(0, Math.min(12, column)) - 1;
      if (column < 0) continue;
      const valueNode = cell.getElementsByTagNameNS("*", "v")[0];
      const inlineNode = cell.getElementsByTagNameNS("*", "t")[0];
      const raw = inlineNode?.textContent || valueNode?.textContent || "";
      row[column] = cell.getAttribute("t") === "s" ? (strings[Number(raw)] || "") : raw;
    }
    return row.slice(0, 12).map(value => value || "");
  }).filter(row => row.some(value => value.trim()));
  return { kind: "table", sheetName: sheetPath.split("/").pop() || "Worksheet", rows };
}

export async function readStudyMaterialPreview(file: Blob, fileName: string): Promise<StudyMaterialPreview> {
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  if (extension === ".txt" || extension === ".rtf" || extension === ".csv") {
    const source = await file.text();
    if (extension === ".csv") return { kind: "table", sheetName: "CSV", rows: parseCsv(source) };
    const text = extension === ".rtf"
      ? source.replace(/\\par[d]?/gi, "\n").replace(/\\'[0-9a-f]{2}/gi, "").replace(/\\[a-z]+-?\d* ?/gi, "").replace(/[{}]/g, "").trim()
      : source;
    return { kind: "text", text };
  }
  if (extension === ".pptx" || extension === ".docx" || extension === ".xlsx") {
    try {
      const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
      if (extension === ".pptx") return pptxPreview(zip);
      if (extension === ".xlsx") return xlsxPreview(zip);
      return { kind: "text", text: wordParagraphs(readZipEntry(zip, "word/document.xml")).join("\n") };
    } catch (reason) {
      return { kind: "unsupported", message: reason instanceof Error ? reason.message : "This Office document could not be previewed. Download the original file to open it in a compatible app." };
    }
  }
  return { kind: "unsupported", message: "This file can be stored and downloaded, but this format does not have an in-app preview yet." };
}
