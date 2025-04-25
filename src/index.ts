import express from "express";
import { lstatSync } from "fs";
import { readdir } from "fs/promises";

const app = express();

type FileType = "file" | "directory";

interface File {
  type: FileType;
  name: string;
}

async function readDir(dir: string) {
  const files = await readdir(dir)
  let output: File[] = [];

  for (const file of files) {
    if (file.startsWith(".")) {
      continue;
    }

    let type: FileType = "file";
    if (lstatSync(dir + file).isDirectory()) {
      type = "directory";
      const dirContents = await readDir(dir + file + "/");
      for (const dirFile of dirContents) {
        output.push({
          name: file + "/" + dirFile.name,
          type: dirFile.type,
        });
      }
    }

    output.push({
      name: file,
      type: type,
    })
  }

  return output;
}

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
    }
  }

  readDir(baseFolder + dir).then((output) => {
    res.send(output);
  })
})

app.listen(3000);
