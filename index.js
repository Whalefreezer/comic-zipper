const JSZip = require("jszip");
const sort = require('alphanum-sort');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);

async function main() {
    let inputFolder = path.resolve(process.argv[2]);
    let chapterNames = await getChapterNames(inputFolder);
    let folders = await getChapterFolders(inputFolder);
    let comicsText = getComicsText(chapterNames, folders);
    let mainZip = new JSZip();

    console.log(comicsText);
    mainZip.file('comics.txt', comicsText);

    await addChaptersToZip(mainZip, inputFolder, folders);

    console.log('Writing to disk...');
    await writeZipToDisk(mainZip, path.basename(inputFolder) + '.cbc');
}

async function getChapterNames(inputFolder) {
    let contentsPath = path.join(inputFolder, 'contents.txt')
    return (await readFile(contentsPath, 'utf8')).split('\n');
}

async function getChapterFolders(inputFolder) {
    let folders = [];
    for (folder of sort(await readdir(inputFolder))) {
        let fullFilePath = path.join(inputFolder, folder);
        if ((await stat(fullFilePath)).isDirectory()) {
            folders.push(folder);
        }
    }
    return folders;
}

function getComicsText(chapterNames, folders) {
    let comicsText = '';
    for (let i = 0; i < folders.length; i++) {
        comicsText += `${folders[i]}.zip:${chapterNames[i]}\n`;
    }
    return comicsText;
}

async function addChaptersToZip(mainZip, inputFolder, folders) {
    for (folder of folders) {
        console.log(folder);
        let stream = await chapterToStream(path.join(inputFolder, folder));
        mainZip.file(folder + '.zip', stream);
    }
}

async function chapterToStream(chapterPath) {
    let zip = new JSZip();
    for (let file of await readdir(chapterPath)) {
        zip.file(file, fs.readFileSync(path.join(chapterPath, file)));
    }
    return zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true });
}


async function writeZipToDisk(zip, outputPath) {
    return new Promise((resolve, reject) => {
        zip.generateNodeStream({ type: 'nodebuffer', streamFiles: true })
            .pipe(fs.createWriteStream(outputPath))
            .on('finish', resolve)
            .on('error', reject);
    });
}

main().catch(err => console.error(err));
