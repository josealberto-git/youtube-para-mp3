import express from "express";
import cors from "cors";
import fs from "fs";
import jwt from "jsonwebtoken";
import { exec } from "child_process";

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static("downloads"));

const SECRET = "123456";

// banco simples
let users = [];
let history = [];

// 🔐 REGISTRO
app.post("/register", (req, res) => {
  const { user, pass } = req.body;

  if (users.find(u => u.user === user)) {
    return res.json({ error: "Usuário já existe" });
  }

  users.push({ user, pass });
  res.json({ ok: true });
});

// 🔐 LOGIN
app.post("/login", (req, res) => {
  const { user, pass } = req.body;

  const u = users.find(x => x.user === user && x.pass === pass);
  if (!u) return res.json({ error: "Login inválido" });

  const token = jwt.sign({ user }, SECRET);
  res.json({ token });
});

// 🔒 MIDDLEWARE
function auth(req, res, next){
  const token = req.headers.authorization;
  if(!token) return res.sendStatus(403);

  try{
    req.user = jwt.verify(token, SECRET);
    next();
  }catch{
    res.sendStatus(403);
  }
}

// 🎬 CONVERTER
app.post("/convert", auth, (req, res) => {
  const { link, format } = req.body;
  const id = Date.now();
  const file = `downloads/${id}.${format}`;

  const cmd =
    format === "mp3"
      ? `yt-dlp -x --audio-format mp3 -o "${file}" ${link}`
      : `yt-dlp -f mp4 -o "${file}" ${link}`;

  exec(cmd, (err) => {
    if (err) return res.json({ error: "Erro" });

    const url = `https://SEU-APP.onrender.com/${id}.${format}`;

    history.push({
      user: req.user.user,
      link,
      format,
      url
    });

    res.json({ download: url });
  });
});

// 📜 HISTÓRICO
app.get("/history", auth, (req, res) => {
  const userHistory = history.filter(h => h.user === req.user.user);
  res.json(userHistory);
});

app.listen(3000, () => console.log("Rodando"));