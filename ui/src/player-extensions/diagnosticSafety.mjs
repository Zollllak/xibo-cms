// GNU AGPL-3.0-or-later. Diagnostics must never display or submit credentials.
export function diagnosticRedactor(configs) {
 const secrets=configs.flatMap(config=>['cmsKey','hardwareKey','apiClientSecret','apiToken','accessToken','refreshToken','xmrPubKey'].map(key=>config?.[key])).filter(value=>typeof value==='string'&&value.length>3).sort((a,b)=>b.length-a.length);
 return value=>{
  let text=String(value);
  for(const secret of secrets)for(const candidate of [secret,encodeURIComponent(secret)])text=text.split(candidate).join('[redacted]');
  return text.replace(/([?&](?:token|key|serverKey|hardwareKey|authorization)=)[^&\s"']*/gi,'$1[redacted]').slice(0,12000);
 };
}
export function diagnosticEnvelope(config,report,date=new Date()) {
 const escape=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
 const log='<logs><log date="'+date.toISOString().slice(0,19).replace('T',' ')+'" category="error"><message>'+escape('PWA-DIAG '+report)+'</message></log></logs>';
 return '<?xml version="1.0"?><soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="urn:xmds"><soap:Body><tns:SubmitLog><serverKey>'+escape(config.cmsKey)+'</serverKey><hardwareKey>'+escape(config.hardwareKey)+'</hardwareKey><logXml>'+escape(log)+'</logXml></tns:SubmitLog></soap:Body></soap:Envelope>';
}
