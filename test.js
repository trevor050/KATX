const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "./output";

async function extractImagesAndData(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  // Make sure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR);
  }

  const sheet = workbook.getWorksheet(1); // First sheet
  const images = sheet.getImages();
  const imageMap = {}; // row number → image file name

  // Map image objects to rows
  images.forEach(({ imageId, range }) => {
    const img = workbook.model.media.find((m) => m.index === imageId);
    if (!img) return;

    // Proper file extension
    const ext = img.type === "jpeg" ? "jpg" : img.type;
    const rowNum = range.tl.nativeRow + 1; // ExcelJS uses 0-index internally

    const fileName = `image-${rowNum}.${ext}`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    fs.writeFileSync(filePath, img.buffer);

    imageMap[rowNum] = fileName;
  });

  // Now extract row data and link image if it exists
  const result = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // skip header

    const itemName = row.getCell("A").value; // Adjust if your column isn't A
    const imageFile = imageMap[rowNumber] || null;

    result.push({
      item: itemName,
      image: imageFile,
    });
  });

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "data.json"),
    JSON.stringify(result, null, 2)
  );

  console.log("✅ Done! Check the output/ folder.");
}

extractImagesAndData("Value List Editor.xlsx");
