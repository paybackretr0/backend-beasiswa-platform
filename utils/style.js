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

module.exports = {
  applyHeaderStyle,
  applyDataRowStyle,
  applyTotalRowStyle,
  applyCenterAlignment,
};
