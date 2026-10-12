const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

let requests = [];
const server = http.createServer(async (request, response) => {
  if (request.url === '/stepper.js') {
    response.writeHead(200, {'Content-Type': 'text/javascript'});
    response.end(fs.readFileSync(path.resolve(__dirname, '../../app/bundles/CoreBundle/Assets/js/17.stepper.js')));
    return;
  }
  if (request.url === '/stepper.css') {
    response.writeHead(200, {'Content-Type': 'text/css'});
    response.end(fs.readFileSync(path.resolve(__dirname, '../../app/bundles/CoreBundle/Assets/css/stepper.css')));
    return;
  }
  if (request.url === '/reset') {
    requests = [];
    response.end();
    return;
  }
  if (request.url === '/requests') {
    response.writeHead(200, {'Content-Type': 'application/json'});
    response.end(JSON.stringify(requests));
    return;
  }
  if (request.method === 'POST') {
    const chunks = [];
    for await (const chunk of request) {
      chunks.push(chunk);
    }
    requests.push({url: request.url, body: Buffer.concat(chunks).toString(), headers: request.headers});
    if (request.url === '/slow') {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    if (request.url === '/redirect') {
      response.writeHead(302, {'Location': '/'});
      response.end();
      return;
    }
    if (request.url === '/json') {
      response.writeHead(200, {'Content-Type': 'application/json'});
      response.end('{}');
      return;
    }
    const status = request.url === '/invalid' ? 422 : request.url === '/failure' ? 500 : 200;
    response.writeHead(status, {'Content-Type': 'text/html; charset=UTF-8'});
    response.end(request.url === '/process'
      ? '<h2>Asset ready</h2><a href="/asset">View asset</a>'
      : status === 422
        ? '<form action="/valid" method="post" data-step-submit="configuration"><p role="alert">Invalid file</p><input name="title" autofocus required><button type="submit">Retry</button></form>'
        : '<h2>Configuration</h2><button type="button" data-step-back>Back</button><button type="button" data-step-next="processing">Process</button><form action="/process" method="post" data-step-submit="processing"><input name="codec" value="webm"><button type="submit">Finish</button></form>');
    return;
  }
  response.writeHead(200, {'Content-Type': 'text/html'});
  response.end('<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/stepper.css"><script defer src="/stepper.js"></script></head><body></body></html>');
});
server.listen(4179, '127.0.0.1');
