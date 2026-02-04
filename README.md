# Service API

Node.js REST API with Express, Prisma, and PostgreSQL for user management.

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (running on port 5433)
- npm

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://<username>:<password>@localhost:<port>/<database_name>
PORT=<port_server>
```

Replace the placeholders:
- `<username>` - Your PostgreSQL username
- `<password>` - Your PostgreSQL password
- `<port>` - PostgreSQL port (default: 5433)
- `<database_name>` - Name of your database
- `<port_server>` - Port to run the node.js application (example:8080)

### 3. Start the Server

**Development mode:**
```bash
npm run dev
```

This will automatically run database migrations and start the server.

**Production mode:**
```bash
npm start
```

This will deploy migrations and start the server.

Server will run on `http://localhost:8080` (or your configured PORT).

## Testing

Run all tests:
```bash
npm test
```

Run tests with coverage report:
```bash
npm run test:coverage
```

Run tests in watch mode (during development):
```bash
npm run test:watch
```

## API Endpoints

### Health Check
- **GET** `/health` - Check if the server and database are running

### User Management
- **POST** `/v1/user` - Create a new user
- **GET** `/v1/user/self` - Get authenticated user info (requires Basic Auth)
- **PUT** `/v1/user/self` - Update authenticated user (requires Basic Auth)

## Project Structure

```
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Auth and error handling
│   └── utils/           # Helper functions
├── tests/               # Jest tests
├── prisma/              # Database schema and migrations
├── index.js             # Application entry point
└── package.json
```

## Common Issues

**Port already in use:**
- Change the `PORT` in `.env` to a different value

**Database connection failed:**
- Make sure PostgreSQL is running
- Verify the `DATABASE_URL` in `.env` matches your setup
- Check database credentials and port number

**Migration errors:**
- Reset the database: `npx prisma migrate reset --force`
- Regenerate Prisma client: `npm run prisma:generate`
