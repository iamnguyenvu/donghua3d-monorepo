import * as fs from 'fs';

let outputBuffer = '';

async function searchOphim(keyword: string) {
  outputBuffer += `\n🔎 Searching for: "${keyword}"...\n`;
  const res = await fetch(`https://ophim1.com/v1/api/tim-kiem?keyword=${encodeURIComponent(keyword)}&limit=30`);
  const data = await res.json() as any;
  if (!data.data || !data.data.items) {
    outputBuffer += 'No results found.\n';
    return;
  }
  for (const item of data.data.items) {
    outputBuffer += `- Title: "${item.name}" | Origin: "${item.origin_name}" | Slug: "${item.slug}" | Category: ${JSON.stringify(item.category || [])}\n`;
  }
}

async function run() {
  await searchOphim('tuyết ưng lĩnh chủ');
  await searchOphim('vũ động càn khôn');
  await searchOphim('tinh thần biến');
  await searchOphim('thần ấn vương tọa');
  await searchOphim('thôn phệ tinh không');

  fs.writeFileSync('src/scripts/search_clean_check_2.txt', outputBuffer);
  console.log('Search clean check 2 completed!');
}

run();
