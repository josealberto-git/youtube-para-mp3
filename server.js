import express from "express";
import cors from "cors";
import { spawn } from "child_process";

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("downloads"));

// pegar thumbnail antes
app.get("/info", (req, res) => {
  const { link } = req.query;

  const proc = spawn("yt-dlp", [
    "--dump-json",
    link
  ]);

  let data = "";

  proc.stdout.on("data", chunk => data += chunk);

  proc.on("close", () => {
    try {
      const json = JSON.parse(data);
      res.json({
        title: json.title,
        thumb: json.thumbnail
      });
    } catch {
      res.json({ error: true });
    }
  });
});

// progresso completo
app.get("/progress", (req, res) => {
  const { link, format } = req.query;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const id = Date.now();
  const file = `downloads/${id}.${format}`;

  const args =
    format === "mp3"
      ? ["-x", "--audio-format", "mp3", "-o", file, link]
      : ["-f", "mp4", "-o", file, link];

  const proc = spawn("yt-dlp", args);

  proc.stdout.on("data", (chunk) => {
    const text = chunk.toString();

    const percent = text.match(/(\d+(\.\d+)?)%/);
    const speed = text.match(/at\s+([0-9.]+\w+\/s)/);
    const eta = text.match(/ETA\s+([0-9:]+)/);

    res.write(`data: ${JSON.stringify({
      percent: percent ? percent[1] : null,
      speed: speed ? speed[1] : null,
      eta: eta ? eta[1] : null
    })}\n\n`);
  });

  proc.on("close", () => {
    res.write(`data: ${JSON.stringify({
      done: true,
      file: `${id}.${format}`
    })}\n\n`);
    res.end();
  });
});

app.listen(3000, () => console.log("Rodando"));