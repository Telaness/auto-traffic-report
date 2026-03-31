import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

const getBrowser = async () => {
  const isVercel = !!process.env.VERCEL;

  if (isVercel) {
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 1280, height: 720 },
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  // ローカル環境ではシステムのChromeを使用
  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
};

export const convertHtmlToPdf = async (html: string): Promise<Buffer> => {
  const browser = await getBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
};

export const convertHtmlsToPdfs = async (
  items: Array<{ html: string; fileName: string }>
): Promise<Array<{ pdf: Buffer; fileName: string }>> => {
  const browser = await getBrowser();

  try {
    const results: Array<{ pdf: Buffer; fileName: string }> = [];

    for (const item of items) {
      const page = await browser.newPage();
      await page.setContent(item.html, { waitUntil: "networkidle0" });
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
      });
      await page.close();
      results.push({ pdf: Buffer.from(pdfBuffer), fileName: item.fileName });
    }

    return results;
  } finally {
    await browser.close();
  }
};
