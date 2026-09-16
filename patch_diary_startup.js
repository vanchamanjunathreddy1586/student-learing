import fs from 'fs';
import path from 'path';

const jsPath = path.join(process.cwd(), 'frontend', 'js', 'diary.js');
let js = fs.readFileSync(jsPath, 'utf8');

// The user wants:
/*
async function startDiarySecurely() {
    await checkLock();
}
*/

// Let's replace the bottom initialization block:
const oldInit = `    // --- Initializing ---
    if(diaryLayout) {
      diaryLayout.style.opacity = '0';
      diaryLayout.style.pointerEvents = 'none';
    }
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app-shell').hidden = false;
    
    checkLock();`;

const newInit = `    // --- Initializing ---
    if(diaryLayout) {
      diaryLayout.style.opacity = '0';
      diaryLayout.style.pointerEvents = 'none';
    }
    
    async function startDiarySecurely() {
        document.getElementById('loading-screen').style.display = 'none';
        document.getElementById('app-shell').hidden = false;
        await checkLock();
    }
    
    await startDiarySecurely();`;

if (js.includes(oldInit)) {
  js = js.replace(oldInit, newInit);
} else {
  console.log("Could not find the old init block!");
  console.log("Checking what's actually there...");
  const match = js.match(/\/\/ --- Initializing ---[\s\S]*?checkLock\(\);/);
  if (match) {
    js = js.replace(match[0], newInit);
  }
}

// Let's also move getHeaders to the top to absolutely guarantee no TDZ issues.
const getHeadersRegex = /\s*const getHeaders = async \(\) => \(\{\s*'Authorization': `Bearer \$\{\(await supabase\.auth\.getSession\(\)\)\.data\.session\?\.access_token\}`,\s*'Content-Type': 'application\/json'\s*\}\);/;
const getHeadersMatch = js.match(getHeadersRegex);

if (getHeadersMatch) {
  js = js.replace(getHeadersMatch[0], ''); // remove from original location
  
  // insert right after supabase initialization
  const insertPoint = `  const user = session?.user;
  if (!user) {
    window.location.href = '/login.html';
    return;
  }`;
  
  if (js.includes(insertPoint)) {
    js = js.replace(insertPoint, insertPoint + '\n\n' + getHeadersMatch[0].trim());
  }
}

fs.writeFileSync(jsPath, js, 'utf8');
console.log('diary.js startup patched successfully.');
