const applyHeaderStyle = (row) => {
  row.height = 25;
  row.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF4472C4" },
  };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      bottom: { style: "thin" },
      right: { style: "thin" },
    };
  });
};

const applyDataRowStyle = (row, index) => {
  if (index % 2 === 0) {
    row.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFF8F9FA" },
    };
  }

  row.eachCell((cell) => {
    cell.border = {
      top: { style: "thin", color: { argb: "FFD3D3D3" } },
      left: { style: "thin", color: { argb: "FFD3D3D3" } },
      bottom: { style: "thin", color: { argb: "FFD3D3D3" } },
      right: { style: "thin", color: { argb: "FFD3D3D3" } },
    };
    cell.alignment = { vertical: "middle" };
  });
};

const applyTotalRowStyle = (row) => {
  row.height = 25;
  row.font = { bold: true, size: 12 };
  row.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFFFEB9C" },
  };
  row.alignment = { vertical: "middle", horizontal: "center" };
  row.eachCell((cell) => {
    cell.border = {
      top: { style: "double" },
      left: { style: "thin" },
      bottom: { style: "double" },
      right: { style: "thin" },
    };
  });
};

const applyCenterAlignment = (sheet, columnKeys) => {
  columnKeys.forEach((key) => {
    sheet.getColumn(key).alignment = {
      horizontal: "center",
      vertical: "middle",
    };
  });
};

const applyTitleRowStyle = (cell, bgColor = "FF4472C4") => {
  cell.font = {
    bold: true,
    size: 16,
    color: { argb: "FFFFFFFF" },
  };
  cell.alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: bgColor },
  };
};

const applyInfoRowStyle = (cell, bgColor = "FFF3F4F6") => {
  cell.font = { italic: true, size: 10 };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: bgColor },
  };
};

const applyFooterRowStyle = (cell) => {
  cell.font = {
    italic: true,
    size: 9,
    color: { argb: "FF6B7280" },
  };
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF3F4F6" },
  };
};

module.exports = {
  applyHeaderStyle,
  applyDataRowStyle,
  applyTotalRowStyle,
  applyCenterAlignment,
  applyTitleRowStyle,
  applyInfoRowStyle,
  applyFooterRowStyle,
};
