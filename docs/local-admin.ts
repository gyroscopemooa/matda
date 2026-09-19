import { readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
const email=process.argv[2]?.toLowerCase();
if(!email){console.error('Usage: npm run local:admin -- existing-account@example.test');process.exit(1);}
const file=path.resolve(process.env.LOCAL_DATA_DIR||'.local','database.json');
const db=JSON.parse(await readFile(file,'utf8'));const user=db.users.find((u:{email:string})=>u.email===email);
if(!user)throw new Error('기존 로컬 회원을 찾을 수 없습니다. 먼저 가입해주세요.');
user.role='admin';await writeFile(file,JSON.stringify(db),'utf8');console.log('Local administrator role assigned. Restart the preview before use.');
