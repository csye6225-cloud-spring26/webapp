import request from 'supertest';
import express from 'express';
import cors from 'cors';
import initializeRoutes from '../src/routes/index.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Helper: directly verify a user in the database (bypasses email flow for tests)
 */
async function verifyUser(username) {
  await prisma.user.update({
    where: { username: username.toLowerCase() },
    data: { verified: true },
  });
}

let app;

beforeAll(async () => {
  app = express();
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  initializeRoutes(app);
});

afterAll(async () => {
  await prisma.user.deleteMany({});
  await prisma.$disconnect();
});

afterEach(async () => {
  await prisma.user.deleteMany({});
});

// ============================================================================
// A. Positive Test Cases - 1. User Creation Tests
// ============================================================================

describe('A. 1. User Creation Tests', () => {
  
  test('A.1.1 - Create valid user', async () => {
    const userData = {
      username: 'sarah.chen@work.com',
      password: 'MyP@ssw0rd123',
      first_name: 'Sarah',
      last_name: 'Chen'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('username', 'sarah.chen@work.com');
    expect(response.body).toHaveProperty('first_name', 'Sarah');
    expect(response.body).toHaveProperty('last_name', 'Chen');
    expect(response.body).not.toHaveProperty('password');
  });

  test('A.1.2 - Returns 201 on successful creation', async () => {
    const userData = {
      username: 'marcus.johnson@gmail.com',
      password: 'SecureP@ss456',
      first_name: 'Marcus',
      last_name: 'Johnson'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('A.1.3 - Response contains all required fields', async () => {
    const userData = {
      username: 'elena.rodriguez@company.com',
      password: 'ElenaPwd@2024',
      first_name: 'Elena',
      last_name: 'Rodriguez'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('username');
    expect(response.body).toHaveProperty('first_name');
    expect(response.body).toHaveProperty('last_name');
    expect(response.body).toHaveProperty('account_created');
    expect(response.body).toHaveProperty('account_updated');
  });

  test('A.1.4 - Different email domains work', async () => {
    const userData = {
      username: 'james.lee@outlook.com',
      password: 'James@Pass789',
      first_name: 'James',
      last_name: 'Lee'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body.username).toBe('james.lee@outlook.com');
  });

  test('A.1.5 - Creates user with org email', async () => {
    const userData = {
      username: 'priya.patel@acmecorp.io',
      password: 'PriyaPwd@123',
      first_name: 'Priya',
      last_name: 'Patel'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body.username).toBe('priya.patel@acmecorp.io');
  });

  test('A.1.6 - Works with email tags', async () => {
    const userData = {
      username: 'david.brown+test@gmail.com',
      password: 'DavidBrown@456',
      first_name: 'David',
      last_name: 'Brown'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body.username).toBe('david.brown+test@gmail.com');
  });
});

// ============================================================================
// A. Positive Test Cases - 2. User Retrieval Tests
// ============================================================================

describe('A. 2. User Retrieval Tests', () => {

  test('A.2.1 - Get authenticated user profile', async () => {
    const userData = {
      username: 'sophia.williams@tech.com',
      password: 'SophiaW@pass2024',
      first_name: 'Sophia',
      last_name: 'Williams'
    };

    const createResponse = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    const userId = createResponse.body.id;

    await verifyUser('sophia.williams@tech.com');
    const authHeader = 'Basic ' + Buffer.from('sophia.williams@tech.com:SophiaW@pass2024').toString('base64');
    const getResponse = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toHaveProperty('id', userId);
    expect(getResponse.body).toHaveProperty('username', 'sophia.williams@tech.com');
  });

  test('A.2.2 - Returns correct user details', async () => {
    const userData = {
      username: 'christopher.taylor@company.com',
      password: 'ChrisTaylor@99',
      first_name: 'Christopher',
      last_name: 'Taylor'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('christopher.taylor@company.com');

    const authHeader = 'Basic ' + Buffer.from('christopher.taylor@company.com:ChrisTaylor@99').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.first_name).toBe('Christopher');
    expect(response.body.last_name).toBe('Taylor');
    expect(response.body.username).toBe('christopher.taylor@company.com');
  });

  test('A.2.3 - Response has all fields', async () => {
    const userData = {
      username: 'jennifer.martinez@dev.com',
      password: 'Jen@Martinez123',
      first_name: 'Jennifer',
      last_name: 'Martinez'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);
    
    await verifyUser('jennifer.martinez@dev.com');

    const authHeader = 'Basic ' + Buffer.from('jennifer.martinez@dev.com:Jen@Martinez123').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('username');
    expect(response.body).toHaveProperty('first_name');
    expect(response.body).toHaveProperty('last_name');
    expect(response.body).toHaveProperty('account_created');
    expect(response.body).toHaveProperty('account_updated');
  });

  test('A.2.4 - Password not exposed in response', async () => {
    const userData = {
      username: 'robert.garcia@enterprise.com',
      password: 'Rob@Garcia2024',
      first_name: 'Robert',
      last_name: 'Garcia'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('robert.garcia@enterprise.com');

    const authHeader = 'Basic ' + Buffer.from('robert.garcia@enterprise.com:Rob@Garcia2024').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.body).not.toHaveProperty('password');
  });
});

// ============================================================================
// A. Positive Test Cases - 3. User Update Tests
// ============================================================================

describe('A. 3. User Update Tests', () => {

  test('A.3.1 - Update first and last name', async () => {
    const userData = {
      username: 'lisa.anderson@startup.com',
      password: 'Lisa@Anderson88',
      first_name: 'Lisa',
      last_name: 'Anderson'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('lisa.anderson@startup.com');
    const authHeader = 'Basic ' + Buffer.from('lisa.anderson@startup.com:Lisa@Anderson88').toString('base64');
    const updateResponse = await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        first_name: 'Elizabeth',
        last_name: 'Andrews'
      });

    expect(updateResponse.status).toBe(204);

    const getResponse = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(getResponse.body.first_name).toBe('Elizabeth');
    expect(getResponse.body.last_name).toBe('Andrews');
  });

  test('A.3.2 - Update only first name', async () => {
    const userData = {
      username: 'michael.zhang@workplace.com',
      password: 'Mike@Zhang321',
      first_name: 'Michael',
      last_name: 'Zhang'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('michael.zhang@workplace.com');

    const authHeader = 'Basic ' + Buffer.from('michael.zhang@workplace.com:Mike@Zhang321').toString('base64');
    const updateResponse = await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        first_name: 'Mitchell'
      });

    expect(updateResponse.status).toBe(204);

    const getResponse = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(getResponse.body.first_name).toBe('Mitchell');
    expect(getResponse.body.last_name).toBe('Zhang');
  });

  test('A.3.3 - Update only last name', async () => {
    const userData = {
      username: 'amanda.wilson@business.com',
      password: 'Amanda@Wil99',
      first_name: 'Amanda',
      last_name: 'Wilson'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('amanda.wilson@business.com');
    
    const authHeader = 'Basic ' + Buffer.from('amanda.wilson@business.com:Amanda@Wil99').toString('base64');
    const updateResponse = await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        last_name: 'Winters'
      });

    expect(updateResponse.status).toBe(204);

    const getResponse = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(getResponse.body.first_name).toBe('Amanda');
    expect(getResponse.body.last_name).toBe('Winters');
  });

  test('A.3.4 - Update password only', async () => {
    const userData = {
      username: 'kevin.thomas@work.com',
      password: 'KevinT@old123',
      first_name: 'Kevin',
      last_name: 'Thomas'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('kevin.thomas@work.com');

    const authHeader = 'Basic ' + Buffer.from('kevin.thomas@work.com:KevinT@old123').toString('base64');
    const updateResponse = await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        password: 'KevinT@new456'
      });

    expect(updateResponse.status).toBe(204);

    const oldAuthHeader = 'Basic ' + Buffer.from('kevin.thomas@work.com:KevinT@old123').toString('base64');
    const oldAuthResponse = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', oldAuthHeader);

    expect(oldAuthResponse.status).toBe(401);

    const newAuthHeader = 'Basic ' + Buffer.from('kevin.thomas@work.com:KevinT@new456').toString('base64');
    const newAuthResponse = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', newAuthHeader);

    expect(newAuthResponse.status).toBe(200);
  });

  test('A.3.5 - Changes persist across requests', async () => {
    const userData = {
      username: 'natalie.clark@online.com',
      password: 'Nat@Clark777',
      first_name: 'Natalie',
      last_name: 'Clark'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('natalie.clark@online.com');

    const authHeader = 'Basic ' + Buffer.from('natalie.clark@online.com:Nat@Clark777').toString('base64');
    
    await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        first_name: 'Natasha',
        last_name: 'Clarke'
      });

    const response1 = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    const response2 = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response1.body.first_name).toBe('Natasha');
    expect(response2.body.first_name).toBe('Natasha');
    expect(response1.body.last_name).toBe('Clarke');
    expect(response2.body.last_name).toBe('Clarke');
  });
});

// ============================================================================
// A. Positive Test Cases - 4. Authentication Tests
// ============================================================================

describe('A. 4. Authentication Tests', () => {

  test('A.4.1 - Login with valid credentials', async () => {
    const userData = {
      username: 'ryan.mitchell@corp.com',
      password: 'Ryan@Mitch2024',
      first_name: 'Ryan',
      last_name: 'Mitchell'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('ryan.mitchell@corp.com');
    
    const authHeader = 'Basic ' + Buffer.from('ryan.mitchell@corp.com:Ryan@Mitch2024').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.username).toBe('ryan.mitchell@corp.com');
  });

  test('A.4.2 - Successful registration', async () => {
    const userData = {
      username: 'olivia.white@mail.com',
      password: 'Olivia@Whi55',
      first_name: 'Olivia',
      last_name: 'White'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  });

  test('A.4.3 - Access protected endpoint with auth', async () => {
    const userData = {
      username: 'daniel.harris@site.com',
      password: 'Daniel@Har99',
      first_name: 'Daniel',
      last_name: 'Harris'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('daniel.harris@site.com');
    
    const authHeader = 'Basic ' + Buffer.from('daniel.harris@site.com:Daniel@Har99').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
  });

  test('A.4.4 - Credentials work across requests', async () => {
    const userData = {
      username: 'isabella.turner@dev.com',
      password: 'Isabella@Turn88',
      first_name: 'Isabella',
      last_name: 'Turner'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('isabella.turner@dev.com');
    
    const authHeader = 'Basic ' + Buffer.from('isabella.turner@dev.com:Isabella@Turn88').toString('base64');

    const response1 = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    const response2 = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    const response3 = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);
  });

  test('A.4.5 - Email is case insensitive', async () => {
    const userData = {
      username: 'Brandon.Foster@email.Com',
      password: 'Brandon@Fos44',
      first_name: 'Brandon',
      last_name: 'Foster'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('brandon.foster@email.com');

    const authHeader = 'Basic ' + Buffer.from('brandon.foster@email.com:Brandon@Fos44').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
  });
});

// ============================================================================
// B. Negative Test Cases - 1. Invalid Input Tests
// ============================================================================

describe('B. 1. Invalid Input Tests', () => {

  test('B.1.1 - Reject missing email', async () => {
    const userData = {
      password: 'PassWord@123',
      first_name: 'Laura',
      last_name: 'Scott'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Missing required fields');
  });

  test('B.1.2 - Reject missing password', async () => {
    const userData = {
      username: 'paul.green@work.com',
      first_name: 'Paul',
      last_name: 'Green'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Missing required fields');
  });

  test('B.1.3 - Reject missing first name', async () => {
    const userData = {
      username: 'rachel.adams@site.com',
      password: 'Rachel@Ad88',
      last_name: 'Adams'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Missing required fields');
  });

  test('B.1.4 - Reject missing last name', async () => {
    const userData = {
      username: 'joshua.king@domain.com',
      password: 'Joshua@King77',
      first_name: 'Joshua'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('message');
    expect(response.body.message).toContain('Missing required fields');
  });

  test('B.1.5 - Reject invalid email format', async () => {
    const userData = {
      username: 'notavalidemail',
      password: 'Pass@2024',
      first_name: 'Emma',
      last_name: 'Watson'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('valid email');
  });

  test('B.1.6 - Reject email without @', async () => {
    const userData = {
      username: 'grahamexamplecom',
      password: 'Graham@Pass55',
      first_name: 'Graham',
      last_name: 'Edwards'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('valid email');
  });

  test('B.1.7 - Reject email without domain', async () => {
    const userData = {
      username: 'owen@',
      password: 'Owen@Secure99',
      first_name: 'Owen',
      last_name: 'Miles'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('valid email');
  });

  test('B.1.8 - Reject password less than 8 chars', async () => {
    const userData = {
      username: 'emily.grant@work.com',
      password: 'short',
      first_name: 'Emily',
      last_name: 'Grant'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('at least 8');
  });

  test('B.1.9 - Reject duplicate email', async () => {
    const userData = {
      username: 'andrew.richardson@corp.com',
      password: 'Andrew@Rich44',
      first_name: 'Andrew',
      last_name: 'Richardson'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(409);
    expect(response.body.message).toContain('already exists');
  });

  test('B.1.10 - Reject empty first name', async () => {
    const userData = {
      username: 'nicholas.hall@mail.com',
      password: 'Nick@Hall333',
      first_name: '',
      last_name: 'Hall'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('required');
  });

  test('B.1.11 - Reject empty last name', async () => {
    const userData = {
      username: 'stephanie.blake@tech.com',
      password: 'Steph@Blake22',
      first_name: 'Stephanie',
      last_name: ''
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('required');
  });

  test('B.1.12 - Reject invalid data type for first name', async () => {
    const userData = {
      username: 'andrew.stewart@site.com',
      password: 'Andrew@Stew11',
      first_name: 12345,
      last_name: 'Stewart'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Invalid input data types');
  });

  test('B.1.13 - Reject empty first name on update', async () => {
    const userData = {
      username: 'aaron.phillips@company.com',
      password: 'Aaron@Phil66',
      first_name: 'Aaron',
      last_name: 'Phillips'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('aaron.phillips@company.com');

    const authHeader = 'Basic ' + Buffer.from('aaron.phillips@company.com:Aaron@Phil66').toString('base64');
    const response = await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        first_name: ''
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('cannot be empty');
  });

  test('B.1.14 - Reject empty last name on update', async () => {
    const userData = {
      username: 'carlos.mendoza@network.com',
      password: 'Carlos@Mend99',
      first_name: 'Carlos',
      last_name: 'Mendoza'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('carlos.mendoza@network.com');

    const authHeader = 'Basic ' + Buffer.from('carlos.mendoza@network.com:Carlos@Mend99').toString('base64');
    const response = await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        last_name: ''
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('cannot be empty');
  });

  test('B.1.15 - Reject short password on update', async () => {
    const userData = {
      username: 'jessica.young@digital.com',
      password: 'Jessica@You88',
      first_name: 'Jessica',
      last_name: 'Young'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('jessica.young@digital.com');

    const authHeader = 'Basic ' + Buffer.from('jessica.young@digital.com:Jessica@You88').toString('base64');
    const response = await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        password: 'short'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('at least 8');
  });

  test('B.1.16 - Reject updating non-updatable field', async () => {
    const userData = {
      username: 'thomas.wright@enterprise.com',
      password: 'Thomas@Wri77',
      first_name: 'Thomas',
      last_name: 'Wright'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('thomas.wright@enterprise.com');

    const authHeader = 'Basic ' + Buffer.from('thomas.wright@enterprise.com:Thomas@Wri77').toString('base64');
    const response = await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        username: 'newemail@domain.com'
      });

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('cannot be updated');
  });
});

// ============================================================================
// B. Negative Test Cases - 2. Authentication Error Tests
// ============================================================================

describe('B. 2. Authentication Error Tests', () => {

  test('B.2.1 - Reject login with wrong password', async () => {
    const userData = {
      username: 'matthew.harris@work.com',
      password: 'Matthew@Har55',
      first_name: 'Matthew',
      last_name: 'Harris'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('matthew.harris@work.com');

    const authHeader = 'Basic ' + Buffer.from('matthew.harris@work.com:WrongPassword99').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
  });

  test('B.2.2 - Reject login for non-existent user', async () => {
    const authHeader = 'Basic ' + Buffer.from('nonexistent@work.com:RandomPass99').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
  });

  test('B.2.3 - Reject access without auth header', async () => {
    const response = await request(app)
      .get('\/v1\/user/self');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
  });

  test('B.2.4 - Reject malformed auth header', async () => {
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', 'Bearer invalidtoken123');

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
  });

  test('B.2.5 - Reject incomplete credentials', async () => {
    const authHeader = 'Basic ' + Buffer.from('onlyusername:').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
  });

  test('B.2.6 - Reject missing password in auth', async () => {
    const authHeader = 'Basic ' + Buffer.from('some.user@work.com:').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
  });

  test('B.2.7 - Reject update without auth', async () => {
    const response = await request(app)
      .put('\/v1\/user/self')
      .set('Content-Type', 'application/json')
      .send({
        first_name: 'NewName'
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
  });

  test('B.2.8 - Reject update with wrong credentials', async () => {
    const authHeader = 'Basic ' + Buffer.from('test@work.com:WrongPassword').toString('base64');
    const response = await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        first_name: 'NewName'
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
  });

  test('B.2.9 - Reject invalid base64 auth', async () => {
    const authHeader = 'Basic InvalidBase64!!!';
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
  });

  test('B.2.10 - Password is case sensitive', async () => {
    const userData = {
      username: 'daniel.scott@company.com',
      password: 'DanielPass123',
      first_name: 'Daniel',
      last_name: 'Scott'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    const authHeader = 'Basic ' + Buffer.from('daniel.scott@company.com:danielpass123').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
  });
});

// ============================================================================
// B. Negative Test Cases - 3. Resource Not Found Tests
// ============================================================================

describe('B. 3. Resource Not Found Tests', () => {

  test('B.3.1 - 404 for non-existent endpoint', async () => {
    const response = await request(app)
      .get('\/v1\/user/nonexistent');

    expect(response.status).toBe(404);
  });

  test('B.3.2 - 404 for invalid path', async () => {
    const response = await request(app)
      .get('\/v1\/user/invalid-endpoint');

    expect(response.status).toBe(404);
  });

  test('B.3.3 - Cannot update non-existent user', async () => {
    const authHeader = 'Basic ' + Buffer.from('ghost@work.com:password123').toString('base64');
    const response = await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        first_name: 'NewName'
      });

    expect(response.status).toBe(401);
    expect(response.body.message).toContain('Authentication');
  });
});

// ============================================================================
// B. Negative Test Cases - 4. HTTP Method Tests
// ============================================================================

describe('B. 4. HTTP Method Tests', () => {

  test('B.4.1 - GET not allowed on user creation', async () => {
    const response = await request(app)
      .get('\/v1\/user');

    expect(response.status).toBe(404);
  });

  test('B.4.2 - DELETE not allowed on user creation', async () => {
    const response = await request(app)
      .delete('\/v1\/user');

    expect(response.status).toBe(404);
  });

  test('B.4.3 - PATCH not allowed on user creation', async () => {
    const response = await request(app)
      .patch('\/v1\/user');

    expect(response.status).toBe(404);
  });

  test('B.4.4 - Unsupported endpoint returns 404', async () => {
    const response = await request(app)
      .get('/api/unsupported-endpoint');

    expect(response.status).toBe(404);
  });

  test('B.4.5 - POST not allowed on retrieval', async () => {
    const userData = {
      username: 'veronica.cooper@work.com',
      password: 'Veron@Coop88',
      first_name: 'Veronica',
      last_name: 'Cooper'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    const response = await request(app)
      .post('\/v1\/user/self')
      .set('Content-Type', 'application/json')
      .send({});

    expect(response.status).toBe(404);
  });

  test('B.4.6 - DELETE not allowed on user endpoint', async () => {
    const userData = {
      username: 'timothy.cox@work.com',
      password: 'Tim@Cox777',
      first_name: 'Timothy',
      last_name: 'Cox'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    const authHeader = 'Basic ' + Buffer.from('timothy.cox@work.com:Tim@Cox777').toString('base64');
    const response = await request(app)
      .delete('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(404);
  });
});

// ============================================================================
// C. Edge Case Tests - 1. Boundary Value Tests
// ============================================================================

describe('C. 1. Boundary Value Tests', () => {

  test('C.1.1 - Handle long first name', async () => {
    const longName = 'A'.repeat(255);
    const userData = {
      username: 'victoria.evans@work.com',
      password: 'Victoria@Ev55',
      first_name: longName,
      last_name: 'Evans'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('C.1.2 - Handle long last name', async () => {
    const longName = 'B'.repeat(255);
    const userData = {
      username: 'william.kelly@work.com',
      password: 'Will@Kell44',
      first_name: 'William',
      last_name: longName
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('C.1.3 - Handle long password', async () => {
    const longPass = 'P'.repeat(512);
    const userData = {
      username: 'zachary.morgan@work.com',
      password: longPass,
      first_name: 'Zachary',
      last_name: 'Morgan'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('C.1.4 - Minimum password length (8 chars)', async () => {
    const userData = {
      username: 'nancy.walker@work.com',
      password: '12345678',
      first_name: 'Nancy',
      last_name: 'Walker'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('C.1.5 - Handle hyphenated first name', async () => {
    const userData = {
      username: 'marie.rousseau@work.com',
      password: 'Marie@Rous99',
      first_name: 'Jean-Marie',
      last_name: 'Rousseau'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('C.1.6 - Handle apostrophe in last name', async () => {
    const userData = {
      username: 'patrick.oneill@work.com',
      password: 'Patrick@One88',
      first_name: 'Patrick',
      last_name: "O'Neill"
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('C.1.7 - Handle Unicode in names', async () => {
    const userData = {
      username: 'francoise.blanc@work.com',
      password: 'Fran@Blanc77',
      first_name: 'Françoise',
      last_name: 'Blanc'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('C.1.8 - Handle Unicode in last name', async () => {
    const userData = {
      username: 'anna.mueller@work.com',
      password: 'Anna@Muel66',
      first_name: 'Anna',
      last_name: 'Müller'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('C.1.9 - Handle numbers in email', async () => {
    const userData = {
      username: 'claire2024@work.com',
      password: 'Claire@2024',
      first_name: 'Claire',
      last_name: 'Bond'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('C.1.10 - Handle special chars in email', async () => {
    const userData = {
      username: 'henry.dover+test@work.com',
      password: 'Henry@Dov55',
      first_name: 'Henry',
      last_name: 'Dover'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('C.1.11 - Single character first name', async () => {
    const userData = {
      username: 'alice.graham@work.com',
      password: 'Alice@Gra44',
      first_name: 'A',
      last_name: 'Graham'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });

  test('C.1.12 - Whitespace in names', async () => {
    const userData = {
      username: 'jean.francois@work.com',
      password: 'Jean@Fran33',
      first_name: 'Jean Claude',
      last_name: 'Francois'
    };

    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(response.status).toBe(201);
  });
});

// ============================================================================
// C. Edge Case Tests - 2. Performance Tests
// ============================================================================

describe('C. 2. Performance Tests', () => {

  test('C.2.1 - User creation response time', async () => {
    const userData = {
      username: 'performance1@work.com',
      password: 'Perf@Test123',
      first_name: 'Performance',
      last_name: 'Test'
    };

    const startTime = Date.now();
    const response = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);
    const endTime = Date.now();

    expect(response.status).toBe(201);
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('C.2.2 - User retrieval response time', async () => {
    const userData = {
      username: 'performance2@work.com',
      password: 'Perf@Test456',
      first_name: 'Performance',
      last_name: 'Query'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('performance2@work.com');
    
    const authHeader = 'Basic ' + Buffer.from('performance2@work.com:Perf@Test456').toString('base64');
    const startTime = Date.now();
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);
    const endTime = Date.now();

    expect(response.status).toBe(200);
    expect(endTime - startTime).toBeLessThan(2000);
  });

  test('C.2.3 - User update response time', async () => {
    const userData = {
      username: 'performance3@work.com',
      password: 'Perf@Test789',
      first_name: 'Performance',
      last_name: 'Update'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('performance3@work.com');

    const authHeader = 'Basic ' + Buffer.from('performance3@work.com:Perf@Test789').toString('base64');
    const startTime = Date.now();
    const response = await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        first_name: 'Updated'
      });
    const endTime = Date.now();

    expect(response.status).toBe(204);
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('C.2.4 - Concurrent creations', async () => {
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        request(app)
          .post('\/v1\/user')
          .set('Content-Type', 'application/json')
          .send({
            username: `user${i}@work.com`,
            password: 'Pass@Secure123',
            first_name: `User${i}`,
            last_name: `Test${i}`
          })
      );
    }

    const responses = await Promise.all(requests);
    responses.forEach(response => {
      expect(response.status).toBe(201);
    });
  });

  test('C.2.5 - Concurrent retrievals', async () => {
    const userData = {
      username: 'concurrent.read@work.com',
      password: 'Read@Concurrent99',
      first_name: 'Concurrent',
      last_name: 'Read'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('concurrent.read@work.com');

    const authHeader = 'Basic ' + Buffer.from('concurrent.read@work.com:Read@Concurrent99').toString('base64');
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        request(app)
          .get('\/v1\/user/self')
          .set('Authorization', authHeader)
      );
    }

    const responses = await Promise.all(requests);
    responses.forEach(response => {
      expect(response.status).toBe(200);
    });
  });
});

// ============================================================================
// C. Edge Case Tests - 3. Data Integrity Tests
// ============================================================================

describe('C. 3. Data Integrity Tests', () => {

  test('C.3.1 - Created user data persists', async () => {
    const userData = {
      username: 'integrity.test@work.com',
      password: 'Integ@Data888',
      first_name: 'Integrity',
      last_name: 'Test'
    };

    const createResponse = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    const createdId = createResponse.body.id;

    await verifyUser('integrity.test@work.com');

    const authHeader = 'Basic ' + Buffer.from('integrity.test@work.com:Integ@Data888').toString('base64');
    const getResponse = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(getResponse.body.id).toBe(createdId);
    expect(getResponse.body.username).toBe('integrity.test@work.com');
    expect(getResponse.body.first_name).toBe('Integrity');
    expect(getResponse.body.last_name).toBe('Test');
  });

  test('C.3.2 - Unmodified fields stay unchanged', async () => {
    const userData = {
      username: 'unchanged.field@work.com',
      password: 'Unchange@Pass77',
      first_name: 'Original',
      last_name: 'Name'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('unchanged.field@work.com');
    const authHeader = 'Basic ' + Buffer.from('unchanged.field@work.com:Unchange@Pass77').toString('base64');

    const beforeUpdate = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    const originalUsername = beforeUpdate.body.username;

    await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        first_name: 'Modified'
      });

    const afterUpdate = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(afterUpdate.body.username).toBe(originalUsername);
    expect(afterUpdate.body.first_name).toBe('Modified');
    expect(afterUpdate.body.last_name).toBe('Name');
  });

  test('C.3.3 - Password update preserves other data', async () => {
    const userData = {
      username: 'password.change@work.com',
      password: 'OldPass@123',
      first_name: 'Password',
      last_name: 'Change'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('password.change@work.com');

    const authHeader = 'Basic ' + Buffer.from('password.change@work.com:OldPass@123').toString('base64');
    const beforeUpdate = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        password: 'NewPass@456'
      });

    await verifyUser('password.change@work.com');
    const newAuthHeader = 'Basic ' + Buffer.from('password.change@work.com:NewPass@456').toString('base64');
    const afterUpdate = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', newAuthHeader);

    expect(afterUpdate.body.first_name).toBe(beforeUpdate.body.first_name);
    expect(afterUpdate.body.last_name).toBe(beforeUpdate.body.last_name);
  });

  test('C.3.4 - Timestamps are consistent', async () => {
    const userData = {
      username: 'timestamp.test@work.com',
      password: 'Time@Stamp99',
      first_name: 'Timestamp',
      last_name: 'Test'
    };

    const createResponse = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    expect(createResponse.body).toHaveProperty('account_created');
    expect(createResponse.body).toHaveProperty('account_updated');
    expect(createResponse.body.account_created).toBeTruthy();
    expect(createResponse.body.account_updated).toBeTruthy();
  });

  test('C.3.5 - Multiple sequential updates work correctly', async () => {
    const userData = {
      username: 'sequential.update@work.com',
      password: 'Seq@Update88',
      first_name: 'Sequential',
      last_name: 'Update'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('sequential.update@work.com');
    const authHeader = 'Basic ' + Buffer.from('sequential.update@work.com:Seq@Update88').toString('base64');

    await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        first_name: 'FirstUpdate'
      });

    await request(app)
      .put('\/v1\/user/self')
      .set('Authorization', authHeader)
      .set('Content-Type', 'application/json')
      .send({
        last_name: 'SecondUpdate'
      });

    const final = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(final.body.first_name).toBe('FirstUpdate');
    expect(final.body.last_name).toBe('SecondUpdate');
  });

  test('C.3.6 - User IDs are unique', async () => {
    const user1 = {
      username: 'unique.one@work.com',
      password: 'Unique@Pass11',
      first_name: 'Unique',
      last_name: 'One'
    };

    const user2 = {
      username: 'unique.two@work.com',
      password: 'Unique@Pass22',
      first_name: 'Unique',
      last_name: 'Two'
    };

    const response1 = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(user1);

    const response2 = await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(user2);

    expect(response1.body.id).not.toBe(response2.body.id);
  });

  test('C.3.7 - Email case normalization works', async () => {
    const userData = {
      username: 'MixedCase.Email@Company.COM',
      password: 'Mixed@Case99',
      first_name: 'Mixed',
      last_name: 'Case'
    };

    await request(app)
      .post('\/v1\/user')
      .set('Content-Type', 'application/json')
      .send(userData);

    await verifyUser('MixedCase.Email@Company.COM');
    const authHeader = 'Basic ' + Buffer.from('mixedcase.email@company.com:Mixed@Case99').toString('base64');
    const response = await request(app)
      .get('\/v1\/user/self')
      .set('Authorization', authHeader);

    expect(response.status).toBe(200);
    expect(response.body.username).toBe('mixedcase.email@company.com');
  });
});
