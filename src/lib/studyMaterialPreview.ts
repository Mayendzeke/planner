import { strFromU8, unzipSync } from "fflate";
import * as pdfjs from "pdfjs-dist";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

export type StudyMaterialPreview =
  | { kind: "text"; text: string }
  | { kind: "slides"; slides: { number: number; title: string; body: string }[] }
  | { kind: "table"; sheetName: string; rows: string[][] }
  | { kind: "workbook"; sheets: { name: string; rows: { value: string; formula?: string }[][] }[] }
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
  const workbookPath = "xl/workbook.xml";
  const relationsPath = "xl/_rels/workbook.xml.rels";
  if (!zip[workbookPath] || !zip[relationsPath]) {
    return { kind: "unsupported", message: "This spreadsheet is missing workbook information. Download the original XLSX file to open it in a compatible app." };
  }
  const workbook = xmlDocument(readZipEntry(zip, workbookPath));
  const relations = xmlDocument(readZipEntry(zip, relationsPath));
  const relationMap = new Map<string,string>();
  Array.from(relations.getElementsByTagNameNS("*","Relationship")).forEach(node => {
    relationMap.set(node.getAttribute("Id") || "", node.getAttribute("Target") || "");
  });
  const strings: string[] = [];
  if (zip["xl/sharedStrings.xml"]) {
    const shared = xmlDocument(readZipEntry(zip, "xl/sharedStrings.xml"));
    strings.push(...Array.from(shared.getElementsByTagNameNS("*", "si")).map(nodeText));
  }
  const sheets = Array.from(workbook.getElementsByTagNameNS("*","sheet")).slice(0,30).flatMap(sheetNode => {
    const name = sheetNode.getAttribute("name") || "Worksheet";
    const relationId = sheetNode.getAttribute("r:id") || sheetNode.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships","id") || "";
    const target = relationMap.get(relationId);
    if (!target) return [];
    const sheetPath = target.startsWith("/") ? target.slice(1) : target.startsWith("xl/") ? target : "xl/" + target;
    if (!zip[sheetPath]) return [];
    const sheet = xmlDocument(readZipEntry(zip,sheetPath));
    const rows = Array.from(sheet.getElementsByTagNameNS("*","row")).slice(0,300).map(rowNode => {
      const row: { value: string; formula?: string }[] = [];
      for (const cell of Array.from(rowNode.getElementsByTagNameNS("*","c"))) {
        const reference = cell.getAttribute("r") || "";
        const letters = reference.match(/^[A-Z]+/i)?.[0] || "";
        let column = 0;
        for (const letter of letters.toUpperCase()) column = column * 26 + letter.charCodeAt(0) - 64;
        column = Math.max(0,Math.min(30,column)) - 1;
        if(column<0) continue;
        const valueNode = cell.getElementsByTagNameNS("*","v")[0];
        const inlineNode = cell.getElementsByTagNameNS("*","t")[0];
        const formulaNode = cell.getElementsByTagNameNS("*","f")[0];
        const raw = inlineNode?.textContent || valueNode?.textContent || "";
        const value = cell.getAttribute("t")==="s" ? (strings[Number(raw)] || "") : cell.getAttribute("t")==="b" ? (raw==="1"?"TRUE":"FALSE") : raw;
        row[column] = { value, formula: formulaNode?.textContent ? "=" + formulaNode.textContent : undefined };
      }
      return row.map(cell=>cell||{value:""});
    }).filter(row=>row.some(cell=>cell.value.trim()||cell.formula));
    return [{ name, rows }];
  });
  if(!sheets.length) return { kind:"unsupported", message:"No readable worksheets were found. Download the original spreadsheet to open it in Excel or another compatible app." };
  return { kind:"workbook", sheets };
}

async function pdfPreview(file:Blob):Promise<StudyMaterialPreview> {
  let document:pdfjs.PDFDocumentProxy|null=null;
  try {
    document=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
    const pages:string[]=[];
    const pageLimit=Math.min(document.numPages,100);
    for(let pageNumber=1;pageNumber<=pageLimit;pageNumber++){
      const page=await document.getPage(pageNumber);
      const content=await page.getTextContent();
      const text=content.items.map(item=>"str" in item?item.str:"").join(" ").replace(/\\s+/g," ").trim();
      if(text)pages.push("--- Page "+pageNumber+" ---\\n"+text);
      if(pages.join("\\n\\n").length>=180000)break;
    }
    const extracted=pages.join("\\n\\n").slice(0,180000);
    if(extracted.trim().length<100)return {kind:"unsupported",message:"This PDF appears to be scanned or image-based, so readable text could not be extracted yet. Upload a text-based PDF or Word version to create a study pack."};
    return {kind:"text",text:extracted};
  } catch(reason) {
    return {kind:"unsupported",message:reason instanceof Error?reason.message:"This PDF could not be read. Download the original file to open it in a compatible app."};
  } finally {
    if(document)void document.destroy();
  }
}

export async function readStudyMaterialPreview(file: Blob, fileName: string): Promise<StudyMaterialPreview> {
  const extension = fileName.toLowerCase().slice(fileName.lastIndexOf("."));
  if (extension === ".pdf") return await pdfPreview(file);
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
