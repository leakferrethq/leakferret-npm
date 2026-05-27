export interface Finding {
  path: string;
  line: number;
  column: number;
  pattern: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'unknown';
  match_redacted: string;
  verdict: 'real' | 'fixture' | 'unknown';
  reason?: string;
  confidence?: number;
  fingerprint?: string;
  verification?: VerificationOutcome;
}

export interface VerificationOutcome {
  status: 'verified' | 'invalid' | 'unverified';
  provider: string;
  http_status?: number;
  reason?: string;
  meta?: unknown;
}

export interface ScanOptions {
  excludes?: string[];
  only?: string[];
  showFixtures?: boolean;
}

export interface VerifyOptions extends ScanOptions {
  mode?: 'none' | 'best-effort' | 'only-verified' | 'ever-verified';
  timeout?: number;
}

export interface RewriteOptions extends ScanOptions {
  apply?: boolean;
  backend?: 'env' | 'vault' | 'doppler' | 'aws-secrets-manager' | 'infisical';
}

export function scan(path?: string, opts?: ScanOptions): Finding[];
export function verify(path?: string, opts?: VerifyOptions): Finding[];
export function rewrite(path?: string, opts?: RewriteOptions): Finding[];
export function binaryPath(): string;
export function detectPlatform(): string;
export function binaryName(): string;
