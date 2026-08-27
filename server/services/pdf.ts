export type ExtractedPage = { pageNumber: number; content: string };

export const extractPdfPages = async (buffer: Buffer): Promise<ExtractedPage[]> => {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const document = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    useSystemFonts: true
  }).promise;
  const pages: ExtractedPage[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
    const page = await document.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const content = textContent.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pages.push({ pageNumber, content });
  }
  return pages;
};
