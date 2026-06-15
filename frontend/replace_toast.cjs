const fs = require('fs');
const files = [
  'src/components/WrapUpModal.tsx',
  'src/hooks/useConfigurationSync.ts',
  'src/lib/api/apiClient.ts',
  'src/pages/About.tsx',
  'src/pages/Add.tsx',
  'src/pages/Comments.tsx',
  'src/store/useAppStore.ts'
];

files.forEach(file => {
  const path = '/Users/vikramadityasingh/Repository/problem-sorter/frontend/' + file;
  let content = fs.readFileSync(path, 'utf-8');
  content = content.replace(/import\s+toast\s+from\s+'react-hot-toast';/g, "import { toast } from 'sonner';");
  content = content.replace(/import\s+\{\s*toast\s*\}\s+from\s+'react-hot-toast';/g, "import { toast } from 'sonner';");
  fs.writeFileSync(path, content, 'utf-8');
});
console.log('Replaced toast imports.');
