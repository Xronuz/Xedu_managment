import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function exportElementToPDF(element: HTMLElement, filename = 'jadval.pdf') {
  const html = document.documentElement;
  const wasDark = html.classList.contains('dark');

  // Force light mode for stable capture (prevents dark-mode text/background artifacts)
  if (wasDark) {
    html.classList.remove('dark');
    // Force reflow so Tailwind dark variants are recomputed before capture
    void html.offsetHeight;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('l', 'mm', 'a4'); // landscape
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } finally {
    if (wasDark) {
      html.classList.add('dark');
    }
  }
}
