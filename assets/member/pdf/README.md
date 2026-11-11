# Visit report PDF (member app)

Loaded on demand by `/member/report-pdf.js` the first time a member taps Download or Share on a visit report.

- `jspdf.umd.min.js`: jsPDF 4.2.1 (MIT, see `jspdf.LICENSE.txt`), vendored so nothing loads from a CDN.
- `report-pdf-build.js`: builds the US Letter report (Full Cover, Task Cards, Photos By Task, System Tiles, Accent Closing) from the page's own report data.
- `fonts/`: Khand and Hind (SIL Open Font License 1.1, Indian Type Foundry), Latin subset, embedded in each PDF.
