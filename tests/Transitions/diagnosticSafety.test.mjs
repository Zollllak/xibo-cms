import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diagnosticRedactor,diagnosticEnvelope} from '../../ui/src/player-extensions/diagnosticSafety.mjs';
test('diagnostics redact current and legacy credentials including URL encoding',()=>{
 const redact=diagnosticRedactor([{cmsKey:'secret-old/value',hardwareKey:'hardware-old'},{cmsKey:'secret-current',accessToken:'token-current'}]);
 const text=redact('secret-old/value secret-old%2Fvalue secret-current hardware-old token-current ?serverKey=unrecognized&token=unknown');
 for(const secret of ['secret-old','secret-current','hardware-old','token-current','unrecognized','unknown'])assert(!text.includes(secret));
 assert(text.includes('[redacted]'));
});
test('diagnostic log XML escapes data and restricts credentials to authentication fields',()=>{
 const report='No image <loaded> & pending';
 const xml=diagnosticEnvelope({cmsKey:'key&value',hardwareKey:'hw<value'},report,new Date('2026-11-13T15:00:00Z'));
 assert(xml.includes('<serverKey>key&amp;value</serverKey>'));
 assert(xml.includes('<hardwareKey>hw&lt;value</hardwareKey>'));
 assert(xml.includes('PWA-DIAG No image &amp;lt;loaded&amp;gt; &amp;amp; pending'));
 assert(xml.includes('category=&quot;error&quot;'));
});
