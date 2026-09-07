import ExcelJS from "exceljs";
import { buildExportModel, type ExportSummary } from "./exportWorkbook";
import type { CategoryReviewItem } from "./types";

export async function buildCategoryReviewWorkbookBuffer(args: {
  categoryName: string;
  items: CategoryReviewItem[];
  summary: ExportSummary;
}): Promise<ArrayBuffer> {
  const model = buildExportModel(args);
  const workbook = new ExcelJS.Workbook();

  const decisions = workbook.addWorksheet(model.sheetNames[0]);
  decisions.views = [{ state: "frozen", ySplit: 1 }];
  decisions.columns = model.decisions.headers.map((header) => ({
    header,
    width: Math.max(14, header.length + 4),
  }));
  model.decisions.rows.forEach((row) => decisions.addRow(row));
  if (model.decisions.headers.length > 0) {
    decisions.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: model.decisions.headers.length },
    };
  }

  const summary = workbook.addWorksheet(model.sheetNames[1]);
  summary.views = [{ state: "frozen", ySplit: 1 }];
  summary.columns = [
    { header: "Field", width: 18 },
    { header: "Value", width: 40 },
  ];
  model.summary.rows.forEach((row) => summary.addRow(row));
  summary.addRow([]);
  summary.addRow(["Legend", ""]);
  model.summary.legend.forEach((line) => summary.addRow(["", line]));

  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.font = { name: model.fontName };
      });
    });
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export function triggerWorkbookDownload(buffer: ArrayBuffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
