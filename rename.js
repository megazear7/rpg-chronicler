import { promises as fs } from "fs";
import path from "path";

const projectName = process.argv[2];
if (!projectName) {
  console.error("Please provide a project name in kebab-case (e.g., my-cool-project).");
  process.exit(1);
}

const capitalizedNameWithSpaces = projectName
  .split('-')
  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');
const camelCaseName = projectName.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
const pascalCaseName = camelCaseName.charAt(0).toUpperCase() + camelCaseName.slice(1);

const replaceInFile = async (filePath) => {
  let content = await fs.readFile(filePath, "utf8");
  content = content.replace(/Zelt Template/g, capitalizedNameWithSpaces);
  content = content.replace(/ZeltTemplate/g, pascalCaseName);
  content = content.replace(/zeltTemplate/g, camelCaseName);
  content = content.replace(/zelt-template/g, projectName);
  await fs.writeFile(filePath, content, "utf8");
};

const walkDir = async (dir) => {
  const files = await fs.readdir(dir);
  files.forEach(async (file) => {
    const fullPath = path.join(dir, file);
    if ((await fs.lstat(fullPath)).isDirectory()) {
      walkDir(fullPath);
    } else {
      replaceInFile(fullPath);
    }
  });
};

walkDir(path.join(process.cwd(), "src"));
replaceInFile(path.join(process.cwd(), "package.json"));
await fs.rm("README.md");
await fs.rename("README-template.md", "README.md");
console.log(`Renamed project to ${projectName} successfully.`);
