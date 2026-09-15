import express from "express";
const app = express();

const mfes = [
  { name: "mfe-activity", path: "activity" },
  { name: "mfe-admin", path: "admin" },
  { name: "mfe-dashboard", path: "dashboard" },
  { name: "mfe-institution", path: "institution" },
  { name: "mfe-student", path: "student" },
];

app.get("/", (_req, res) => {
  const links = mfes.map((m) => `<li><a href="/mfe/${m.path}">${m.name}</a></li>`).join("");
  res.send(`
    <html>
      <body>
        <h1>MFE Host Shell (dev)</h1>
        <p>Escolha um módulo:</p>
        <ul>${links}</ul>
      </body>
    </html>
  `);
});

mfes.forEach((m) => {
  app.get(`/mfe/${m.path}`, (_req, res) => {
    res.send(`
      <html>
        <body>
          <h1>Hello from ${m.name}</h1>
          <p>Este é um exemplo "hello world" para o módulo ${m.name}.</p>
          <p><a href="/">Voltar</a></p>
        </body>
      </html>
    `);
  });
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
app.listen(port, () => console.log(`MFE host listening ${port}`));
