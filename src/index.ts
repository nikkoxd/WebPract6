import express from "express";
import { lstatSync } from "fs";
import { readdir } from "fs/promises";

const app = express();

type FileType = "file" | "directory";

interface File {
  type: FileType;
  name: string;
  contents?: File[];
}

async function readDir(dir: string) {
  const files = await readdir(dir)
  let output: File[] = [];

  for (const file of files) {
    if (file.startsWith(".")) {
      continue;
    }

    let type: FileType = "file";
    let contents: File[] | undefined;
    if (lstatSync(dir + file).isDirectory()) {
      type = "directory";
      const dirContents = await readDir(dir + file + "/");
      contents = dirContents;
    }

    output.push({
      name: file,
      type: type,
      contents: contents,
    })
  }

  return output;
}

app.get("/download", (req, res) => {
  let path = req.query.path?.toString();

  if (!path) {
    res.status(404).send("File not found");
  } 
  if (lstatSync("./uploads/" + path).isDirectory()) {
    res.status(404).send("Directory not found");
  }

  path = "./uploads/" + path;

  res.download(path);
})

app.get("/", (req, res) => {
  const baseFolder = "./uploads/";
  let dir = req.query.dir?.toString();

  if (!dir) {
    dir = "";
  } else {
    dir += "/"
    if (dir.startsWith("/")) {
      dir = dir.substring(1);
    } else if (dir.startsWith("./")) {
      dir = dir.substring(2);
    } else if (dir.startsWith(".")) {
      res.status(404).send("Directory not found");
    }
  }

  readDir(baseFolder + dir).then((output) => {
    res.send(output);
  })
})

app.listen(3000);
