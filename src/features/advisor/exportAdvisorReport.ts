import type { CoverageItem, DecisionOption } from "@/types/clarifi";

type ReportInput = {
  coverageItems: CoverageItem[];
  selectedCoverageIds: string[];
  decisionOptions: DecisionOption[];
  selectedDecisionIds: string[];
  coverageProfile: Array<{ label: string; coverage: number }>;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 48;

export async function exportAdvisorReport(input: ReportInput) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  page.drawText("ClariFi session report", {
    x: MARGIN,
    y,
    size: 22,
    font: bold,
    color: rgb(0.04, 0.28, 0.43),
  });
  y -= 24;
  page.drawText(
    `Tan Li Wen  |  Generated ${new Date().toLocaleDateString("en-SG")}`,
    {
      x: MARGIN,
      y,
      size: 9,
      font: regular,
      color: rgb(0.38, 0.43, 0.49),
    },
  );
  y -= 28;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 1,
    color: rgb(0.84, 0.88, 0.91),
  });
  y -= 30;

  const section = (title: string) => {
    page.drawText(title, {
      x: MARGIN,
      y,
      size: 13,
      font: bold,
      color: rgb(0.09, 0.13, 0.19),
    });
    y -= 22;
  };

  const row = (label: string, value: string, highlighted = false) => {
    page.drawRectangle({
      x: MARGIN,
      y: y - 8,
      width: PAGE_WIDTH - MARGIN * 2,
      height: 25,
      color: highlighted ? rgb(0.91, 0.96, 0.93) : rgb(0.97, 0.98, 0.99),
    });
    page.drawText(label, {
      x: MARGIN + 10,
      y,
      size: 9,
      font: regular,
      color: rgb(0.18, 0.23, 0.29),
    });
    const valueWidth = bold.widthOfTextAtSize(value, 9);
    page.drawText(value, {
      x: PAGE_WIDTH - MARGIN - 10 - valueWidth,
      y,
      size: 9,
      font: bold,
      color: highlighted ? rgb(0.08, 0.47, 0.2) : rgb(0.04, 0.36, 0.56),
    });
    y -= 31;
  };

  section("Session coverage");
  input.coverageItems.forEach((item) =>
    row(
      item.label,
      input.selectedCoverageIds.includes(item.id) ? "Covered" : "Follow up",
      input.selectedCoverageIds.includes(item.id),
    ),
  );
  y -= 12;

  section("Key decisions made");
  const decisions = input.decisionOptions.filter((item) =>
    input.selectedDecisionIds.includes(item.id),
  );
  if (decisions.length) {
    decisions.forEach((item) => row(item.title, item.category, true));
  } else {
    row("No decision path selected", "Pending");
  }
  y -= 12;

  section("Current coverage profile");
  input.coverageProfile.forEach((item) =>
    row(item.label, `${item.coverage}%`, item.coverage >= 65),
  );

  y -= 8;
  page.drawText(
    "Knowledge support only. Product recommendations and financial advice remain with the licensed advisor.",
    {
      x: MARGIN,
      y,
      size: 8,
      font: regular,
      color: rgb(0.38, 0.43, 0.49),
    },
  );

  const bytes = await document.save();
  const buffer = new ArrayBuffer(bytes.length);
  new Uint8Array(buffer).set(bytes);
  const blob = new Blob([buffer], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement("a");
  link.href = url;
  link.download = `clarifi-session-report-${new Date().toISOString().slice(0, 10)}.pdf`;
  window.document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
