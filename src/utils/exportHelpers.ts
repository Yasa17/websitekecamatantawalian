/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StatisticCategory, VillageProfile } from '../types';
import {
  buildStatisticHeaderRows,
  getStatisticLeafColumns,
  getStatisticTable,
  statisticHeaderLabel,
} from './statisticTable';

const escapeHtml = (value: string | number) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

/**
 * Downloads data as a CSV file.
 */
export function exportToCSV(category: StatisticCategory): void {
  const table = getStatisticTable(category);
  const leaves = getStatisticLeafColumns(table.columns);
  const csvCell = (value: string | number) =>
    `"${String(value).replace(/"/g, '""')}"`;
  const csvContent = [
    leaves.map((leaf) => csvCell(statisticHeaderLabel(leaf))).join(','),
    ...table.rows.map((row) =>
      leaves
        .map((leaf) => csvCell(row.values[leaf.column.id] ?? ''))
        .join(','),
    ),
  ].join('\r\n');

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${category.id}_data_tabel.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Downloads data as a styled Excel XML Spreadsheet.
 * This is fully compatible with Microsoft Excel and LibreOffice, complete with styles, headers, and colored borders!
 */
export function exportToExcel(category: StatisticCategory): void {
  const fileName = `${category.id}_data_desa.xls`;
  const worksheetName = 'Data Desa';

  const xmlContent = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:binoculars"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom"/>
   <Borders/>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#0D9488"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D1D5DB"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F766E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="TitleStyle">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="14" ss:Bold="1" ss:Color="#111827"/>
  </Style>
  <Style ss:ID="DescStyle">
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="10" ss:Italic="1" ss:Color="#4B5563"/>
  </Style>
  <Style ss:ID="CellLeft">
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11"/>
  </Style>
  <Style ss:ID="CellRight">
   <Alignment ss:Horizontal="Right"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E5E7EB"/>
   </Borders>
   <Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="11"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="${worksheetName}">
  <Table ss:ExpandedColumnCount="2" x:FullColumns="1" x:FullRows="1" ss:DefaultRowHeight="17">
   <Column ss:Width="250"/>
   <Column ss:Width="120"/>
   <Row ss:Height="25">
    <Cell ss:StyleID="TitleStyle"><Data ss:Type="String">${category.title}</Data></Cell>
   </Row>
   <Row ss:Height="18">
    <Cell ss:StyleID="DescStyle"><Data ss:Type="String">${category.description}</Data></Cell>
   </Row>
   <Row><Cell><Data ss:Type="String"></Data></Cell></Row>
   <Row ss:Height="22">
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Item Kategori</Data></Cell>
    <Cell ss:StyleID="HeaderStyle"><Data ss:Type="String">Jumlah / Nilai</Data></Cell>
   </Row>
   ${category.items.map(item => `
   <Row ss:Height="20">
    <Cell ss:StyleID="CellLeft"><Data ss:Type="String">${item.label}</Data></Cell>
    <Cell ss:StyleID="CellRight"><Data ss:Type="Number">${item.value}</Data></Cell>
   </Row>`).join('')}
  </Table>
 </Worksheet>
</Workbook>`;

  const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), xmlContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * High-fidelity PDF printer.
 * Renders an official-looking village document report inside a print iframe
 * and triggers standard PDF printer window. Includes Kop Desa, Official Metadata,
 * and elegant typography suitable for government reports.
 * 
 * We do this through an elegant printable report sandbox to guarantee CSS formatting.
 */
export function exportToPDF(category: StatisticCategory, villageProfile: VillageProfile): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const dateStr = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const table = getStatisticTable(category);
  const leaves = getStatisticLeafColumns(table.columns);
  const headerRows = buildStatisticHeaderRows(table.columns);
  const printableHeader = headerRows
    .map(
      (row, rowIndex) => `
        <tr>
          ${
            rowIndex === 0
              ? `<th rowspan="${headerRows.length}" style="width: 42px; text-align: center;">No</th>`
              : ''
          }
          ${row
            .map(
              ({ column, colSpan, rowSpan }) => `
                <th colspan="${colSpan}" rowspan="${rowSpan}" style="text-align: center;">
                  ${escapeHtml(column.label)}
                </th>
              `,
            )
            .join('')}
        </tr>
      `,
    )
    .join('');
  const printableRows = table.rows
    .map(
      (row, index) => `
        <tr>
          <td style="text-align: center;">${index + 1}</td>
          ${leaves
            .map((leaf) => {
              const value = row.values[leaf.column.id] ?? '';
              const displayedValue =
                typeof value === 'number'
                  ? value.toLocaleString('id-ID')
                  : value;
              return `
                <td style="${
                  leaf.column.dataType === 'number'
                    ? 'text-align: right; font-weight: 600;'
                    : ''
                }">${escapeHtml(displayedValue)}</td>
              `;
            })
            .join('')}
        </tr>
      `,
    )
    .join('');
  const unitLabel = villageProfile.contentLabel || (villageProfile.administrationLevel === 'kecamatan' ? 'Kecamatan' : villageProfile.administrationLevel === 'kelurahan' ? 'Kelurahan' : 'Desa');
  const headRole = villageProfile.headRole || (unitLabel === 'Kecamatan' ? 'Camat' : unitLabel === 'Kelurahan' ? 'Lurah' : 'Kepala Desa');
  const officeLabel = villageProfile.officeLabel || `Kantor ${unitLabel}`;
  const locationName = villageProfile.name.replace(/^(Kecamatan|Desa|Kelurahan)\s+/i, '');
  const logoText = villageProfile.name
    .replace(/^(Kecamatan|Desa|Kelurahan)\s+/i, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  printWindow.document.write(`
    <html>
      <head>
        <title>LAPORAN STATISTIK ${escapeHtml(villageProfile.name).toUpperCase()}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
          @page {
            size: ${leaves.length > 4 ? 'A4 landscape' : 'A4 portrait'};
            margin: 12mm;
          }
          body {
            font-family: 'Inter', sans-serif;
            color: #111827;
            padding: 40px;
            margin: 0;
            background: #ffffff;
          }
          /* Kop Surat Resmi */
          .kop-surat {
            display: flex;
            align-items: center;
            border-bottom: 3px double #000;
            padding-bottom: 15px;
            margin-bottom: 30px;
          }
          .kop-surat .logo {
            font-size: 32px;
            font-weight: 800;
            margin-right: 20px;
            color: #0d9488;
            border: 3px solid #0d9488;
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
          }
          .kop-surat .text {
            flex-grow: 1;
            text-align: center;
          }
          .kop-surat h1 {
            font-size: 18px;
            font-weight: 700;
            margin: 0;
            letter-spacing: 1px;
            text-transform: uppercase;
          }
          .kop-surat h2 {
            font-size: 22px;
            font-weight: 800;
            margin: 3px 0;
            color: #0f766e;
            text-transform: uppercase;
          }
          .kop-surat p {
            font-size: 11px;
            margin: 0;
            color: #4b5563;
          }
          
          /* Laporan Body */
          .title-section {
            text-align: center;
            margin-bottom: 25px;
          }
          .title-section h3 {
            font-size: 16px;
            font-weight: 700;
            margin: 0;
            text-transform: uppercase;
            text-decoration: underline;
          }
          .title-section p {
            font-size: 13px;
            color: #4b5563;
            margin: 5px 0 0 0;
          }

          .metadata-table {
            width: 100%;
            margin-bottom: 20px;
            font-size: 13px;
            border-collapse: collapse;
          }
          .metadata-table td {
            padding: 4px 8px;
          }
          .metadata-table td.label {
            width: 25%;
            font-weight: 600;
            color: #374151;
          }

          /* Main Table */
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: ${leaves.length > 8 ? '8px' : leaves.length > 5 ? '10px' : '12px'};
            table-layout: fixed;
          }
          .data-table th {
            background-color: #f3f4f6;
            border: 1px solid #d1d5db;
            padding: 12px;
            font-weight: 600;
            text-align: center;
            text-transform: uppercase;
            font-size: 12px;
            color: #374151;
          }
          .data-table td {
            border: 1px solid #d1d5db;
            padding: 10px 12px;
            overflow-wrap: anywhere;
          }
          .data-table tr.total-row {
            font-weight: 700;
            background-color: #f9fafb;
          }

          /* Tanda Tangan */
          .ttd-section {
            margin-top: 50px;
            float: right;
            width: 250px;
            text-align: center;
            font-size: 14px;
          }
          .ttd-section .tanggal {
            margin-bottom: 70px;
          }
          .ttd-section .nama {
            font-weight: 700;
            text-decoration: underline;
          }
          .ttd-section .nip {
            font-size: 12px;
            color: #4b5563;
            margin-top: 3px;
          }

          @media print {
            body {
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="kop-surat">
          <div class="logo">${escapeHtml(logoText || 'TW')}</div>
          <div class="text">
            <h1>Pemerintah ${escapeHtml(villageProfile.regency)}</h1>
            <h2>${escapeHtml(officeLabel)} ${escapeHtml(locationName)}</h2>
            <p>${escapeHtml(villageProfile.address)} | Telp: ${escapeHtml(villageProfile.phone)} | Email: ${escapeHtml(villageProfile.email)}</p>
          </div>
        </div>

        <div class="title-section">
          <h3>Laporan Statistik ${escapeHtml(unitLabel)} & Potensi Wilayah</h3>
          <p>Dokumen Laporan Visualisasi Data ${escapeHtml(villageProfile.name)}</p>
        </div>

        <table class="metadata-table">
          <tr>
            <td class="label">Nama File Laporan</td>
            <td>: STAT-${escapeHtml(category.id.toUpperCase())}-${new Date().getFullYear()}</td>
            <td class="label">Tanggal Cetak</td>
            <td>: ${dateStr}</td>
          </tr>
          <tr>
            <td class="label">Nama Kategori</td>
            <td>: ${escapeHtml(category.title)}</td>
            <td class="label">Pemberi Laporan</td>
            <td>: Sistem Profil ${escapeHtml(villageProfile.name)}</td>
          </tr>
          <tr>
            <td class="label">Uraian Kategori</td>
            <td colspan="3">: ${escapeHtml(category.description)}</td>
          </tr>
          <tr>
            <td class="label">Struktur Tabel</td>
            <td>: ${table.rows.length} baris, ${leaves.length} kolom</td>
            <td class="label">Kolom Angka</td>
            <td>: ${leaves.filter((leaf) => leaf.column.dataType === 'number').length}</td>
          </tr>
        </table>

        <table class="data-table">
          <thead>
            ${printableHeader}
          </thead>
          <tbody>
            ${printableRows || `<tr><td colspan="${leaves.length + 1}" style="text-align: center;">Belum ada data.</td></tr>`}
          </tbody>
        </table>

        <div class="ttd-section">
          <div class="tanggal">${escapeHtml(locationName)}, ${dateStr}</div>
          <div class="nama">${escapeHtml(villageProfile.headName)}</div>
          <div class="nip">${escapeHtml(headRole)} ${escapeHtml(locationName)}</div>
        </div>

        <script>
          window.onload = function() {
            window.print();
            // Automatically close after printing dialog disappears
            setTimeout(function() {
              window.close();
            }, 500);
          }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

/**
 * Export Recharts SVG Graphic directly to Image (PNG, JPG, JPEG)
 * This works natively by discovering the active SVG inside the Recharts container.
 */
export function exportChartToImage(containerId: string, format: 'png' | 'jpeg' | 'jpg', filename: string): void {
  // Let's find the SVG element inside the given container element
  const container = document.getElementById(containerId);
  if (!container) {
    console.error('Chart container element not found!');
    return;
  }

  const svgElement = container.querySelector('svg');
  if (!svgElement) {
    console.error('SVG element not found inside chart container!');
    return;
  }

  // Set solid backgrounds for JPEGs / JPGs (Canvas requires explicit white backdrop, as transparent defaults to black in JPEG format)
  const isJpeg = format === 'jpeg' || format === 'jpg';

  // 1. Core measurements
  const width = svgElement.clientWidth || svgElement.getBoundingClientRect().width || 600;
  const height = svgElement.clientHeight || svgElement.getBoundingClientRect().height || 350;

  // Clone SVG to modify style variables / inject dimensions if needed
  const svgClone = svgElement.cloneNode(true) as SVGSVGElement;
  svgClone.setAttribute('width', width.toString());
  svgClone.setAttribute('height', height.toString());
  
  // Serialize SVG to XML string
  const serializer = new XMLSerializer();
  const svgXML = serializer.serializeToString(svgClone);

  // Convert to Base64
  const svgBase64 = window.btoa(unescape(encodeURIComponent(svgXML)));
  const imageSource = `data:image/svg+xml;base64,${svgBase64}`;

  // Process through Canvas
  const img = new Image();
  img.crossOrigin = 'anonymous';
  
  img.onload = () => {
    // Standard high-definition canvas rendering scaled to DPI
    const canvas = document.createElement('canvas');
    canvas.width = width * 2; // high resolution representation
    canvas.height = height * 2;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Apply high-res scale
    ctx.scale(2, 2);

    if (isJpeg) {
      // Solid white background for JPEG so it isn't transparent (which transforms to black)
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
    }

    // Draw the vectorized SVG image to canvas
    ctx.drawImage(img, 0, 0, width, height);

    // Export format mapping
    const mimeType = isJpeg ? 'image/jpeg' : 'image/png';
    const quality = 1.0; // max quality resolution

    const imgURL = canvas.toDataURL(mimeType, quality);
    
    // Download link
    const link = document.createElement('a');
    link.download = `${filename}.${format}`;
    link.href = imgURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  img.onerror = (err) => {
    console.error('Failed to parse SVG path to image output:', err);
  };

  img.src = imageSource;
}
