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

For CloudWatch/StatsD metrics (optional locally, recommended in EC2):

```env
STATSD_HOST=127.0.0.1
STATSD_PORT=8125
```

If not provided, the app defaults to `localhost:8125`.

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

### Metadata
- **GET** `/v1/metadata` - Get cloud instance metadata (public endpoint)

### User Management
- **POST** `/v1/user` - Create a new user
- **GET** `/v1/user/self` - Get authenticated user info (requires Basic Auth)
- **PUT** `/v1/user/self` - Update authenticated user (requires Basic Auth)

### Courses (requires Basic Auth)
- **GET** `/v1/courses` - List all courses
- **POST** `/v1/courses` - Create a new course
- **GET** `/v1/courses/:course_id` - Get a course by ID
- **PUT** `/v1/courses/:course_id` - Update a course by ID
- **DELETE** `/v1/courses/:course_id` - Delete a course by ID

### Syllabus (requires Basic Auth)
- **GET** `/v1/courses/:course_id/syllabus` - Get syllabus metadata for a course
- **POST** `/v1/courses/:course_id/syllabus` - Upload syllabus file for a course (`multipart/form-data`, field name: `file`)
- **DELETE** `/v1/courses/:course_id/syllabus` - Delete syllabus for a course

## Observability (CloudWatch Logs + Metrics)

### Logs

- Application logs are written to `/opt/csye6225/logs/webapp.log`.
- CloudWatch Agent reads that file and ships logs to CloudWatch Log Group `csye6225-webapp`.

### Custom Metrics (StatsD)

The application emits custom metrics to CloudWatch Agent StatsD listener (`:8125`) using `hot-shots`.

#### 1) API usage metrics (dynamic for all routes)

- Emitted by global middleware in `src/middleware/metricsMiddleware.js`.
- Every handled route emits:
	- `api.<endpoint>.count`
	- `api.<endpoint>.response_time`
- Endpoint names are generated dynamically from Express route templates (`req.baseUrl + req.route.path`), so new routes are automatically covered without code changes.
- Example metric names:
	- `api.get_user_self.count`
	- `api.put_user_self.response_time`
	- `api.get_courses_by_course_id_syllabus.count`

#### 2) Database query timing metrics

- Emitted centrally from Prisma instrumentation in `src/db.js`.
- Metric format:
	- `db.query.<model>.<operation>`
- Example:
	- `db.query.user.findunique`
	- `db.query.course.findmany`

#### 3) S3 API metrics

- Emitted from `src/services/s3Service.js`.
- Metrics emitted per operation:
	- `s3.putobject.count`
	- `s3.putobject.response_time`
	- `s3.putobject.error`
	- `s3.deleteobject.count`
	- `s3.deleteobject.response_time`
	- `s3.deleteobject.error`

### Verify in CloudWatch

1. Ensure CloudWatch Agent is running with StatsD enabled (`service_address: ":8125"`).
2. Call APIs (for example `/health`, `/v1/user`, `/v1/user/self`, `/v1/courses`).
3. Open CloudWatch → Metrics → Namespace `csye6225-webapp`.
4. Search metric names beginning with `api.`, `db.query.`, and `s3.`.

### Notes

- Metric names use lowercase and dot separators.
- Dynamic route-based naming avoids high-cardinality values like IDs.
- If a request is not matched to a route, API metric name falls back to `api.unknown.*`.

## Project Structure

```
├── src/
│   ├── controllers/     # Request handlers
│   ├── models/          # Database models
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── middleware/      # Auth, error handling, and request metrics
│   └── utils/           # Helper functions (logger, metrics)
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

> **Note**: This repository uses GitHub Actions for CI.
> All changes to the `main` branch must be made via pull requests
> and must pass required status checks before merging