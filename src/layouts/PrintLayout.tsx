import type { ReactNode } from 'react'

interface PrintLayoutProps {
  children: ReactNode
  documentTitle?: string
}

export function PrintLayout({ children, documentTitle }: PrintLayoutProps) {
  return (
    <div className="print-layout">
      <style>{`
        @media print {
          body {
            margin: 0;
            padding: 0;
          }
          .print-layout {
            margin: 0;
            padding: 20mm;
          }
          /* Hide non-print elements */
          .sidebar,
          .header,
          nav,
          button,
            [data-no-print] {
            display: none !important;
          }
          /* Print optimizations */
          .page-break {
            page-break-after: always;
          }
          .avoid-break {
            page-break-inside: avoid;
          }
          a {
            text-decoration: none;
            color: inherit;
          }
        }
        @page {
          size: A4;
          margin: 20mm;
        }
      `}</style>
      <div className="max-w-4xl mx-auto bg-white">
        {documentTitle && (
          <h1 className="text-2xl font-bold mb-6 print:text-3xl">
            {documentTitle}
          </h1>
        )}
        {children}
      </div>
    </div>
  )
}
