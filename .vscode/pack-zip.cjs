const { join } = require("path");
const {
  existsSync,
  readFileSync,
  createWriteStream,
  readdirSync,
  statSync,
} = require("fs");
const jszip = require("jszip");

const iconFile = join(__dirname, "../icon.png");
const pluginJSON = join(__dirname, "../plugin.json");
const buildFolder = join(__dirname, "../build");
let readmeDotMd = join(__dirname, "../readme.md");
let changelogDotMd = join(__dirname, "../CHANGELOG.md");

if (!existsSync(readmeDotMd)) {
  readmeDotMd = join(__dirname, "../README.md");
}

// create zip file of build folder

const zip = new jszip();

zip.file("icon.png", readFileSync(iconFile));
zip.file("plugin.json", readFileSync(pluginJSON));
zip.file("readme.md", readFileSync(readmeDotMd));
zip.file("CHANGELOG.md", readFileSync(changelogDotMd));

loadFile("", buildFolder);

zip
  .generateNodeStream({ type: "nodebuffer", streamFiles: true })
  .pipe(createWriteStream(join(__dirname, "../Plugin.zip")))
  .on("finish", () => {
    console.log("Plugin.zip written.");
  });

function loadFile(root, folder) {
  const distFiles = readdirSync(folder);
  distFiles.forEach((file) => {
    const stat = statSync(join(folder, file));

    if (stat.isDirectory()) {
      zip.folder(file);
      loadFile(join(root, file), join(folder, file));
      return;
    }

    if (!/LICENSE.txt/.test(file)) {
      zip.file(join(root, file), readFileSync(join(folder, file)));
    }
  });
}
