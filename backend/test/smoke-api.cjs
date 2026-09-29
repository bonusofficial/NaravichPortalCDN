require('dotenv').config();
const assert = require('node:assert/strict');
const sharp = require('sharp');

const baseUrl = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const type = response.headers.get('content-type') || '';
  const body = type.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${path} -> ${response.status}: ${JSON.stringify(body)}`);
  }
  return { response, body };
}

async function run() {
  const health = await request('/api/v1/health');
  assert.equal(health.body.status, 'ok');

  const login = await request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.SEED_ADMIN_EMAIL,
      password: process.env.SEED_ADMIN_PASSWORD,
    }),
  });
  const authorization = `Bearer ${login.body.accessToken}`;

  const projects = await request('/api/v1/projects?limit=100', {
    headers: { Authorization: authorization },
  });
  let project = projects.body.data.find((item) => item.slug === 'local-smoke-test');
  if (!project) {
    const created = await request('/api/v1/projects', {
      method: 'POST',
      headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Local Smoke Test',
        slug: 'local-smoke-test',
        description: 'Created by the backend smoke test',
        quotaBytes: '1073741824',
      }),
    });
    project = created.body;
  }

  const keyResult = await request('/api/v1/api-keys', {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `Smoke test ${new Date().toISOString()}`,
      projectId: project.id,
      scopes: ['image:upload'],
    }),
  });
  assert.ok(keyResult.body.token.startsWith('ncdn_live_'));
  assert.equal('secretHash' in keyResult.body.apiKey, false);

  const input = await sharp({
    create: {
      width: 2400,
      height: 1600,
      channels: 3,
      background: { r: 16, g: 169, b: 200 },
    },
  })
    .png()
    .toBuffer();
  const form = new FormData();
  form.append('file', new Blob([input], { type: 'image/png' }), 'smoke-image.png');
  const upload = await request('/api/v1/images', {
    method: 'POST',
    headers: { 'X-API-Key': keyResult.body.token },
    body: form,
  });
  assert.equal(upload.body.status, 'ready');
  assert.ok(upload.body.outputBytes <= 5000000);

  const publicAsset = await fetch(upload.body.url);
  assert.equal(publicAsset.status, 200);
  assert.equal(publicAsset.headers.get('content-type'), 'image/webp');

  const summary = await request('/api/v1/dashboard/summary', {
    headers: { Authorization: authorization },
  });
  assert.ok(summary.body.totalAssets >= 1);

  await request(`/api/v1/api-keys/${keyResult.body.apiKey.id}/revoke`, {
    method: 'POST',
    headers: { Authorization: authorization },
  });

  console.log(
    JSON.stringify(
      {
        status: 'ok',
        projectId: project.id,
        assetId: upload.body.id,
        assetUrl: upload.body.url,
        originalBytes: upload.body.originalBytes,
        outputBytes: upload.body.outputBytes,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
