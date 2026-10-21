"use client";

/**
 * Prints the page's print sheet (the element with id "print-doc") alone:
 * the browser's print dialog saves it as a PDF. The file name the dialog
 * offers is the document title, so it is set for the moment of printing.
 */
export function PrintButton({ label, fileName, className = "" }: { label: string; fileName: string; className?: string }) {
  const print = () => {
    const title = document.title;
    document.title = fileName;
    setTimeout(() => {
      window.print();
      document.title = title;
    }, 50);
  };
  return (
    <button type="button" onClick={print} className={`rounded-lg bg-mist px-3.5 py-2 text-[14px] font-semibold text-black/80 hover:bg-mist-2 print:hidden ${className}`}>
      {label}
    </button>
  );
}
