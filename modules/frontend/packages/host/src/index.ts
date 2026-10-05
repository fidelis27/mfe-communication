import { createServer } from "node:http";

const mfes = [
  { name: "mfe-activity", path: "activity" },
  { name: "mfe-admin", path: "admin" },
  { name: "mfe-dashboard", path: "dashboard" },
  { name: "mfe-institution", path: "institution" },
  { name: "mfe-student", path: "student" },
];

const server = createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  response.setHeader("Content-Type", "text/html; charset=utf-8");

  if (pathname === "/") {
  const links = mfes.map((m) => `<li><a href="/mfe/${m.path}">${m.name}</a></li>`).join("");
    response.writeHead(200);
    response.end(`
    <html>
      <body>
        <h1>MFE Host Shell (dev)</h1>
        <p>Escolha um módulo:</p>
        <ul>${links}</ul>
      </body>
    </html>
  `);
    return;
  }

  const mfe = mfes.find((item) => pathname === `/mfe/${item.path}`);
  if (mfe) {
    response.writeHead(200);
    response.end(`
      <html>
        <body>
          <h1>Hello from ${mfe.name}</h1>
          <p>Este é um exemplo "hello world" para o módulo ${mfe.name}.</p>
          <p><a href="/">Voltar</a></p>
        </body>
      </html>
    `);
    return;
  }

  response.writeHead(404);
  response.end("Not found");
});

const port = process.env.PORT ? Number(process.env.PORT) : 4000;
server.listen(port, () => console.log(`MFE host listening ${port}`));
