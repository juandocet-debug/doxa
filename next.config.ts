import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/api/pdf': ['node_modules/pdfkit/js/data/**/*'],
    '/api/export/pdf/*': ['node_modules/pdfkit/js/data/**/*'],
    '/api/admin/evidencias/pdf': ['node_modules/pdfkit/js/data/**/*'],
    '/api/admin/evidencias/*/pdf': ['node_modules/pdfkit/js/data/**/*'],
  },
};

export default nextConfig;
