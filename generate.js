const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
// .git や node_modules などの隠しフォルダ・除外フォルダを除いてディレクトリ一覧を取得
const directories = fs.readdirSync(rootDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('.'))
  .map(dirent => dirent.name);

const tools = [];

for (const dir of directories) {
  const indexPath = path.join(rootDir, dir, 'index.html');
  if (fs.existsSync(indexPath)) {
    const content = fs.readFileSync(indexPath, 'utf-8');
    // <title>タグからツール名を取得
    const titleMatch = content.match(/<title>(.*?)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : dir;
    tools.push({ dir, title });
  }
}

// ------------------------------------
// 1. index.html の生成
// ------------------------------------
const htmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TRPG Tools</title>
  <style>
    :root {
      --bg-color: #f9fafb;
      --card-bg: #ffffff;
      --text-main: #111827;
      --primary: #0059b3;
      --border: #e5e7eb;
    }
    body { 
      font-family: "Meiryo", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif;
      background: var(--bg-color); 
      color: var(--text-main); 
      padding: 2rem 1rem; 
      max-width: 900px; 
      margin: 0 auto;
      line-height: 1.6;
    }
    header {
      text-align: center;
      margin-bottom: 2rem;
    }
    h1 { 
      color: var(--primary); 
      margin-bottom: 0.5rem;
    }
    p.desc {
      color: #6b7280;
      font-size: 0.95rem;
    }
    .tool-list { 
      display: grid; 
      gap: 1.5rem; 
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); 
      padding: 0; 
      list-style: none; 
    }
    .tool-card { 
      background: var(--card-bg); 
      padding: 1.5rem; 
      border-radius: 8px; 
      box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
      border: 1px solid var(--border); 
      transition: transform 0.2s, box-shadow 0.2s; 
      display: flex;
      flex-direction: column;
    }
    .tool-card:hover { 
      transform: translateY(-3px); 
      box-shadow: 0 4px 12px rgba(0,0,0,0.1); 
      border-color: #cbd5e1;
    }
    .tool-card a { 
      text-decoration: none; 
      color: var(--primary); 
      font-weight: 700; 
      font-size: 1.1rem; 
      margin-bottom: 0.5rem;
    }
    .tool-card a::after {
      content: '';
      position: absolute;
      inset: 0;
    }
    .tool-card {
      position: relative;
    }
    .tool-dir { 
      font-size: 0.85rem; 
      color: #9ca3af; 
      font-family: monospace;
      margin-top: auto;
    }
  </style>
</head>
<body>
  <header>
    <h1>TRPG Tools</h1>
    <p class="desc">自作TRPGツールのインデックスページ</p>
  </header>
  <ul class="tool-list">
    ${tools.map(t => `
      <li class="tool-card">
        <a href="${t.dir}/">${t.title}</a>
        <div class="tool-dir">/${t.dir}</div>
      </li>
    `).join('')}
  </ul>
</body>
</html>`;

fs.writeFileSync(path.join(rootDir, 'index.html'), htmlContent);


// ------------------------------------
// 2. README.md の更新
// ------------------------------------
const readmePath = path.join(rootDir, 'README.md');
let readmeContent = '';
if (fs.existsSync(readmePath)) {
  readmeContent = fs.readFileSync(readmePath, 'utf-8');
} else {
  readmeContent = '# trpg-tool-page\n';
}

const listStartMarker = '<!-- TOOL_LIST_START -->';
const listEndMarker = '<!-- TOOL_LIST_END -->';

const listMarkdown = tools.map(t => `- [${t.title}](/${t.dir}/)`).join('\n');
const replacement = `${listStartMarker}\n${listMarkdown}\n${listEndMarker}`;

if (readmeContent.includes(listStartMarker) && readmeContent.includes(listEndMarker)) {
  // 既存のマーカー内を置換
  readmeContent = readmeContent.replace(
    new RegExp(`${listStartMarker}[\\s\\S]*?${listEndMarker}`),
    replacement
  );
} else {
  // マーカーがなければ末尾に追記
  readmeContent += `\n\n## ツール一覧\n${replacement}`;
}

fs.writeFileSync(readmePath, readmeContent);

console.log(`✅ 生成完了しました！`);
console.log(`- ツール数: ${tools.length}`);
console.log(`- index.html と README.md を更新しました。`);
