import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from './test-app';

describe('Auth and task flow (e2e)', () => {
  let app: INestApplication<App>;
  let authCookie: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('registers a user, creates workspace/project/task', async () => {
    const email = `e2e-${Date.now()}@example.com`;
    const password = 'password123';

    await request(app.getHttpServer())
      .post('/users')
      .send({ name: 'E2E User', email, password })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email, password })
      .expect(201);

    authCookie = loginResponse.headers['set-cookie']?.join('; ') ?? '';
    expect(authCookie).toContain('accessToken');

    const workspaceResponse = await request(app.getHttpServer())
      .post('/workspaces')
      .set('Cookie', authCookie)
      .send({ name: 'E2E Workspace' })
      .expect(201);

    const workspaceId = workspaceResponse.body.id;

    const projectResponse = await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/projects`)
      .set('Cookie', authCookie)
      .send({ name: 'E2E Project', description: 'Smoke test project' })
      .expect(201);

    const projectId = projectResponse.body.id;

    await request(app.getHttpServer())
      .post(`/projects/${projectId}/tasks`)
      .set('Cookie', authCookie)
      .send({ title: 'E2E Task', status: 'TODO', priority: 'MEDIUM' })
      .expect(201);

    const tasksResponse = await request(app.getHttpServer())
      .get(`/projects/${projectId}/tasks`)
      .set('Cookie', authCookie)
      .expect(200);

    expect(tasksResponse.body.items).toHaveLength(1);
    expect(tasksResponse.body.items[0].title).toBe('E2E Task');
  });

  it('refreshes an access token using the refresh cookie', async () => {
    expect(authCookie).toBeTruthy();

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .set('Cookie', authCookie)
      .expect(201);

    expect(refreshResponse.body.user.email).toContain('@example.com');
    expect(refreshResponse.headers['set-cookie']?.join('; ')).toContain(
      'accessToken',
    );
  });
});
