import { execFileSync } from 'node:child_process';
import { expect, it } from 'vitest';

it('keeps the VPS database private and transaction credentials out of the API', () => {
 const env={...process.env,POSTGRES_PASSWORD:'synthetic_test_password',API_DOMAIN:'api.example.test',ACME_EMAIL:'ops@example.test',ALLOWED_ORIGINS:'https://app.example.test',PRIVY_APP_ID:'synthetic',PRIVY_VERIFICATION_KEY:'synthetic-public-key',SUPABASE_URL:'https://synthetic.supabase.co',SUPABASE_SECRET_KEY:'synthetic-server-key'};
 const config=JSON.parse(execFileSync('docker',['compose','--env-file','deploy/vps/.env.example','-f','deploy/vps/compose.yaml','--profile','tools','config','--format','json'],{cwd:process.cwd(),env,encoding:'utf8'}));
 expect(config.services.db.ports??[]).toEqual([]);
 expect(config.services.db.healthcheck.test.join(' ')).toContain('pg_isready -h 127.0.0.1');
 expect(config.services.api.ports??[]).toEqual([]);
 expect(config.services.api.environment).not.toHaveProperty('RELAYER_PRIVATE_KEY');
 expect(config.services.api.environment.NODE_ENV).toBe('production');
 expect(config.services.api.healthcheck.test.join(' ')).toContain('/ready');
 expect(config.services.caddy.ports.map((p:{published:string})=>String(p.published)).sort()).toEqual(['443','443','80']);
 expect(config.services.migrate.profiles).toEqual(['tools']);
});
it('refuses blank production credentials instead of using local defaults', () => {
 expect(() => execFileSync('docker',['compose','--env-file','deploy/vps/.env.example','-f','deploy/vps/compose.yaml','config','--quiet'],{env:{...process.env,POSTGRES_PASSWORD:''},stdio:'pipe'})).toThrow();
});
