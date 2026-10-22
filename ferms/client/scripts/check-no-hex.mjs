// scripts/check-no-hex.mjs
// Scans client/src for hex colors (#RGB, #RRGGBB, #RRGGBBAA), rgb(, and hsl( in .css, .jsx, and .js files.
// Ignores styles/tokens.css and the mocks folder.
// Identifies hits in Vedant's files vs Parth's files per docs/CONVENTIONS.md.
// Lists hits in Parth's files for him to fix, and exits 1 if any hits remain in Vedant's files.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

// Regex for hex colors (#RGB, #RGBA, #RRGGBB, #RRGGBBAA)
const HEX_REGEX = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![0-9a-fA-F])/;
// Regex for rgb( / rgba(
const RGB_REGEX = /\brgba?\s*\(/i;
// Regex for hsl( / hsla(
const HSL_REGEX = /\bhsla?\s*\(/i;

const EXTENSIONS = new Set(['.css', '.jsx', '.js']);

// Front-end ownership per docs/CONVENTIONS.md:
// Parth: Login, Register, AuthContext, ProtectedRoute, SocketContext, useSocketEvent,
//        useNotifications, IncidentForm, MyReports, NotificationBell, AssignOverride, UserManagement, Landing.
// Vedant: app foundation, router, design tokens, UI kit (components/ui), AppNavbar, EmergencyCallCard,
//         MonitoringDashboard, map components, StationManagement, StationResources, MyAssignments, IncidentDetail, useIncidents.
function isParthFile(relPath) {
  const normalized = relPath.replace(/\\/g, '/');
  return (
    normalized.includes('components/incidents/') ||
    normalized.includes('components/common/NotificationBell') ||
    normalized.includes('components/common/ProtectedRoute') ||
    normalized.includes('pages/citizen/') ||
    normalized.includes('pages/admin/UserManagement') ||
    normalized.includes('pages/auth/') ||
    normalized.includes('pages/dispatch/AssignOverride') ||
    normalized.includes('pages/public/Landing')
  );
}

function collectFiles(dir, files = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const normalized = fullPath.replace(/\\/g, '/');

    if (entry.isDirectory()) {
      if (entry.name === 'mocks' || normalized.includes('/mocks')) {
        continue;
      }
      collectFiles(fullPath, files);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (EXTENSIONS.has(ext)) {
        if (normalized.endsWith('styles/tokens.css')) {
          continue;
        }
        files.push(fullPath);
      }
    }
  }
  return files;
}

const files = collectFiles(srcDir);
const hits = [];

for (const filePath of files) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNum = index + 1;
    const hasHex = HEX_REGEX.test(line);
    const hasRgb = RGB_REGEX.test(line);
    const hasHsl = HSL_REGEX.test(line);

    if (hasHex || hasRgb || hasHsl) {
      const relativePath = path.relative(path.resolve(__dirname, '..'), filePath).replace(/\\/g, '/');
      hits.push({
        file: relativePath,
        line: lineNum,
        text: line.trim(),
      });
    }
  });
}

const strict = process.argv.includes('--all') || process.argv.includes('--strict');
const vedantHits = hits.filter((h) => !isParthFile(h.file));
const parthHits = hits.filter((h) => isParthFile(h.file));

if (parthHits.length > 0) {
  console.log(`\x1b[33m[lint:tokens] Found ${parthHits.length} color literal(s) in Parth's files (listed for Parth to fix):\x1b[0m\n`);
  for (const hit of parthHits) {
    console.log(`  ${hit.file}:${hit.line} -> ${hit.text}`);
  }
}

if (vedantHits.length > 0) {
  console.error(`\n\x1b[31m[lint:tokens] Found ${vedantHits.length} forbidden color literal(s) in Vedant's files:\x1b[0m\n`);
  for (const hit of vedantHits) {
    console.error(`  ${hit.file}:${hit.line} -> ${hit.text}`);
  }
  console.error('\n\x1b[31mPlease replace hardcoded colors in Vedant\'s files with tokens from src/styles/tokens.css (var(--token)).\x1b[0m');
  process.exit(1);
} else {
  console.log(`\n\x1b[32m[lint:tokens] Vedant's files: All clean! 0 hardcoded colors found.\x1b[0m`);
  if (strict && parthHits.length > 0) {
    console.error(`\x1b[31m[lint:tokens] Strict mode failed because of hits in Parth's files.\x1b[0m`);
    process.exit(1);
  }
  process.exit(0);
}
