import express from "express";
import fileUpload from "express-fileupload";
import { existsSync, lstatSync, mkdirSync, writeFileSync } from "fs";
import { readdir } from "fs/promises";

const app = express();
app.use(fileUpload());

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

app.get("/upload", (_, res) => {
  res.sendFile(__dirname + "/upload.html");
})

app.post("/upload", (req, res) => {
  const file = req.files?.file;
  let dir = req.body.dir?.toString();

  if (Array.isArray(file)) {
    res.status(400).send("Can't upload multiple files at once");
    return;
  }

  if (!dir) {
    dir = "";
  }
  if (!file) {
    res.status(400).send("File not specified");
    return;
  }

  if (dir.startsWith("/")) {
    dir = dir.substring(1);
  } else if (dir.startsWith("./")) {
    dir = dir.substring(2);
  } else if (dir.startsWith(".")) {
    res.status(400).send("Can't upload into hidden directories");
  }

  if (existsSync("./uploads/" + dir)) {
    if (!lstatSync("./uploads/" + dir).isDirectory()) {
      res.status(400).send("Specified path is not a directory");
    }
  } else {
    mkdirSync("./uploads/" + dir, { recursive: true });
  }

  writeFileSync("./uploads/" + dir + "/" + file.name, file.data);
  res.send("File uploaded");
});

app.get("/download", (req, res) => {
  let path = req.query.path?.toString();

  if (!path) {
    res.status(404).send("File not found");
    return;
  }
  if (lstatSync("./uploads/" + path).isDirectory()) {
    res.status(400).send("Can only download files");
    return;
  }

  if ((path?.startsWith(".") && !path?.startsWith("./")) || path?.includes("/.")) {
    res.status(503).send("Can't download hidden files");
    return;
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
    if (!existsSync(baseFolder + dir)) {
      res.status(404).send("Directory not found");
      return;
    }

    if (!lstatSync(baseFolder + dir).isDirectory()) {
      res.status(400).send("Can only view directories");
      return;
    }
    dir += "/";

    if (dir.startsWith("/")) {
      dir = dir.substring(1);
    } else if (dir.startsWith("./")) {
      dir = dir.substring(2);
    } else if (dir.startsWith(".")) {
      res.status(503).send("Can't view hidden directories");
      return;
    }

    if (dir.match(/\/\.[A-z]/)) {
      res.status(503).send("Can't view hidden directories");
    }
  }

  // if (!dir) {
  //   dir = "";
  // } else {
  //   dir += "/"
  //   if (dir.startsWith("/")) {
  //     dir = dir.substring(1);
  //   } else if (dir.startsWith("./")) {
  //     dir = dir.substring(2);
  //   } else if (dir.startsWith(".") && !dir.startsWith("..")) {
  //     res.status(503).send("Can't view hidden directories");
  //     return;
  //   }
  // }

  readDir(baseFolder + dir).then((output) => {
    res.send(output);
  })
})

app.listen(3000);
