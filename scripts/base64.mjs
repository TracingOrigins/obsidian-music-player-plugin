// scripts/base64.mjs
// 作用：把 src/assets 下的图片转成 base64，输出到 src/assets/images.ts，
// 以便在打包时内联文本形式的图片资源，避免图片文件直接出现在插件发布包里。
// 说明：不是每次构建都需要执行，仅在更换/新增图片资源时手动运行。
// 调用方式：node scripts/base64.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../');
const assetsDir = path.join(projectRoot, 'src/assets');
const outputFile = path.join(projectRoot, 'src/assets/images.ts');

const imageFiles = ['disc.png', 'needle.png'];

function imageToBase64(filePath) {
	const fileBuffer = fs.readFileSync(filePath);
	const base64 = fileBuffer.toString('base64');
	const ext = path.extname(filePath).toLowerCase();
	
	const mimeTypes = {
		'.png': 'image/png',
		'.jpg': 'image/jpeg',
		'.jpeg': 'image/jpeg',
		'.gif': 'image/gif',
		'.svg': 'image/svg+xml',
	};
	
	const mimeType = mimeTypes[ext] || 'image/png';
	return `data:${mimeType};base64,${base64}`;
}

function build() {
	const exports = [];
	let handled = 0;

	for (const filename of imageFiles) {
		const filePath = path.join(assetsDir, filename);
		if (!fs.existsSync(filePath)) {
			console.warn(`⚠ 文件不存在: ${filePath}`);
			continue;
		}
		const base64Uri = imageToBase64(filePath);
		const key = path.basename(filename, path.extname(filename)).toUpperCase();
		const constName = `${key}_IMAGE`;
		exports.push(`export const ${constName} = ${JSON.stringify(base64Uri)};`);
		console.log(`✓ 已处理: ${filename}`);
		handled += 1;
	}

	if (!handled) {
		console.warn('⚠ 未找到可处理的图片文件，未生成 images.ts');
		return;
	}

	const banner = `// 本文件由 scripts/base64.mjs 自动生成\n` +
`// 将图片转成 base64，以便内联为文本资源；请勿手动编辑\n\n`;
	const content = banner + exports.join('\n') + '\n';

	// 若内容无变化则跳过写入
	if (fs.existsSync(outputFile)) {
		const existing = fs.readFileSync(outputFile, 'utf8');
		if (existing === content) {
			console.log('✓ images.ts 已是最新，未写入');
			return;
		}
	}

	fs.writeFileSync(outputFile, content, 'utf-8');
	console.log(`✓ 已生成资源文件: ${outputFile}`);
}

build();


