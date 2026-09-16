import puppeteer from "puppeteer-core";

const getBrowser = async () => {
  // puppeteer-core はChromium本体を同梱しないため、ブラウザの場所を明示する必要がある。
  // 本番/Docker環境では PUPPETEER_EXECUTABLE_PATH を指定し、未指定時はインストール済みChromeを利用する。
  const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;

  return puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    ...(executablePath ? { executablePath } : { channel: "chrome" }),
  });
};

export const convertHtmlsToPdfs = async (
  items: Array<{ html: string; fileName: string }>
): Promise<Array<{ pdf: Buffer; fileName: string }>> => {
  const browser = await getBrowser();

  try {
    const results: Array<{ pdf: Buffer; fileName: string }> = [];

    for (const item of items) {
      const page = await browser.newPage();
      // レポートHTMLはCSSも含め完全にインライン化されており外部リソースを読まないため、
      // networkidle0（無通信500msの待機）は1件あたり約500msの純粋な待ち時間になる。
      await page.setContent(item.html, { waitUntil: "load" });
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
