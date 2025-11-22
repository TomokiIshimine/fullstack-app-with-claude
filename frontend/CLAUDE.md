# Frontend Guide

This file provides guidance to Claude Code when working with the React + TypeScript frontend.

## Architecture Overview

### Build System

Vite with TypeScript. Uses `@` alias pointing to `src/` directory (configured in `vite.config.ts`).

**Configuration files:**

- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript compiler options
- `.eslintrc.cjs` - ESLint rules
- `.prettierrc` - Prettier formatting rules

### API Communication

Vite dev server proxies `/api/*` requests to backend:

- Target configured via `VITE_API_PROXY` environment variable
- Defaults to `http://localhost:5000`
- In Docker, set to `http://backend:5000`

**Example API call:**

```typescript
// Frontend makes request to /api/auth/login
// Vite proxies it to http://localhost:5000/api/auth/login
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
})
```

### Component Organization

```
src/
├── pages/           # Page-level components (e.g., LoginPage.tsx)
├── components/      # Reusable UI components (e.g., ProtectedRoute.tsx)
├── contexts/        # React Context (e.g., AuthContext.tsx)
├── styles/          # CSS files
├── App.tsx          # Root component with routing
└── main.tsx         # Application entry point
```

**Component conventions:**

- Page components: `<FeatureName>Page.tsx` (e.g., `LoginPage.tsx`)
- UI components: `<ComponentName>.tsx` (e.g., `ProtectedRoute.tsx`)
- One component per file
- Co-locate styles when possible

### Testing

Uses **Vitest** with **Testing Library** for component testing.

**Test configuration:**

- `vitest.config.ts` - Vitest test runner configuration
- `scripts/test.mjs` - Test runner wrapper with single-threaded execution
- Test files: `*.test.tsx` or `*.test.ts`

**Testing patterns:**

```typescript
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('LoginForm', () => {
  it('should submit form with valid credentials', () => {
    render(<LoginForm onSubmit={mockSubmit} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockSubmit).toHaveBeenCalledWith({ email: 'test@example.com', password: 'password123' });
  });
});
```

## Development Commands

### Running the Frontend

```bash
# With Docker Compose (recommended)
make up                   # Starts all services including frontend

# Standalone (without Docker)
pnpm --dir frontend run dev --host 0.0.0.0 --port 5173
```

### Testing

```bash
# Run all frontend tests
pnpm --dir frontend run test

# Run specific test file
pnpm --dir frontend run test <file>

# Run tests in watch mode
pnpm --dir frontend run test:watch

# Run tests with coverage
pnpm --dir frontend run test:coverage
```

### Linting and Formatting

```bash
# Linting
pnpm --dir frontend run lint

# Type checking
pnpm --dir frontend run type-check

# Formatting
pnpm --dir frontend run format

# Format check (CI)
pnpm --dir frontend run format:check
```

### Building

```bash
# Build for production
pnpm --dir frontend run build

# Preview production build
pnpm --dir frontend run preview
```

### Dependencies

```bash
# Install dependencies
pnpm --dir frontend install

# Add new dependency
pnpm --dir frontend add <package>

# Add development dependency
pnpm --dir frontend add -D <package>
```

## Code Style Guidelines

### ESLint Rules

- **TypeScript rules**: Enforced via `@typescript-eslint`
- **React rules**: Enforced via `eslint-plugin-react`
- **Max warnings**: 0 (warnings treated as errors in CI)

### Prettier Configuration

- **Print width**: 100 characters
- **Tab width**: 2 spaces
- **Semicolons**: Always
- **Single quotes**: true
- **Trailing commas**: es5

### TypeScript Conventions

```typescript
// Use explicit types for props
interface TodoFormProps {
  onSubmit: (title: string) => void
  disabled?: boolean
}

// Use type for unions/intersections
type Status = 'active' | 'completed' | 'all'

// Prefer functional components with TypeScript
const TodoForm: React.FC<TodoFormProps> = ({ onSubmit, disabled = false }) => {
  // Component logic
}
```

### File Naming

- **Components**: PascalCase (e.g., `TodoForm.tsx`, `TodoList.tsx`)
- **Utilities**: camelCase (e.g., `apiClient.ts`, `helpers.ts`)
- **Test files**: Match source file with `.test` suffix (e.g., `TodoForm.test.tsx`)

## Feature Implementation Example: User Authentication

The authentication feature demonstrates the full frontend stack:

### Files

- **Page**: `src/pages/LoginPage.tsx` - Main login page
- **Context**: `src/contexts/AuthContext.tsx` - Authentication state management
- **Components**:
  - `src/components/ProtectedRoute.tsx` - Route guard for authenticated pages
- **Styles**: `src/styles/auth.css` - Authentication-specific styles
- **Tests**: `src/**/*.test.tsx` - Component tests

### Implementation Pattern

1. **Define Types**

   ```typescript
   interface User {
     id: number
     email: string
   }

   interface LoginCredentials {
     email: string
     password: string
   }
   ```

2. **Create API Functions**

   ```typescript
   const login = async (credentials: LoginCredentials): Promise<User> => {
     const response = await fetch('/api/auth/login', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify(credentials),
     })
     const data = await response.json()
     return data.user
   }

   const logout = async (): Promise<void> => {
     await fetch('/api/auth/logout', { method: 'POST' })
   }
   ```

3. **Build UI Components**

   ```typescript
   const LoginForm: React.FC<{ onSubmit: (credentials: LoginCredentials) => void }> = ({ onSubmit }) => {
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');

     const handleSubmit = (e: React.FormEvent) => {
       e.preventDefault();
       onSubmit({ email, password });
     };

     return (
       <form onSubmit={handleSubmit}>
         <input
           type="email"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
           placeholder="Email"
         />
         <input
           type="password"
           value={password}
           onChange={(e) => setPassword(e.target.value)}
           placeholder="Password"
         />
         <button type="submit">Login</button>
       </form>
     );
   };
   ```

4. **Compose Page**

   ```typescript
   const LoginPage: React.FC = () => {
     const { login: authLogin } = useAuth();
     const navigate = useNavigate();

     const handleLogin = async (credentials: LoginCredentials) => {
       try {
         await authLogin(credentials);
         navigate('/dashboard');
       } catch (error) {
         console.error('Login failed:', error);
       }
     };

     return (
       <div>
         <h1>Login</h1>
         <LoginForm onSubmit={handleLogin} />
       </div>
     );
   };
   ```

5. **Write Tests**

   ```typescript
   describe('LoginForm', () => {
     it('should submit credentials on form submit', async () => {
       const mockOnSubmit = vi.fn();
       render(<LoginForm onSubmit={mockOnSubmit} />);

       const emailInput = screen.getByPlaceholderText('Email');
       await userEvent.type(emailInput, 'test@example.com');

       const passwordInput = screen.getByPlaceholderText('Password');
       await userEvent.type(passwordInput, 'password123');

       const button = screen.getByText('Login');
       await userEvent.click(button);

       expect(mockOnSubmit).toHaveBeenCalledWith({
         email: 'test@example.com',
         password: 'password123'
       });
     });
   });
   ```

## Logging

The frontend uses a comprehensive logging system with environment-based configuration, sensitive data masking, API request tracking, and global error handling.

### Architecture

The logging system is implemented in `lib/logger.ts` with the following components:

1. **Environment-Aware Logging**: Different log levels for development and production
2. **Sensitive Data Masking**: Automatic filtering of passwords, tokens, and secrets
3. **API Request Tracking**: Automatic logging of API calls with timing information
4. **Global Error Handling**: Catches uncaught errors and unhandled promise rejections
5. **React Error Boundary**: Catches React component errors and displays fallback UI

### Configuration

Logging is configured via environment variables in `frontend/.env`:

- **VITE_LOG_LEVEL**: Logging level (DEBUG, INFO, WARN, ERROR, SILENT)
  - Development: `DEBUG` (default)
  - Production: `WARN` (default)
- **VITE_ENABLE_API_LOGGING**: Enable/disable API request logging
  - Development: `true` (default)
  - Production: `false` (default)

### Log Format

All logs include timestamps and severity levels:

```
[2025-10-27T10:30:45.123Z] INFO: Todo created successfully
[2025-10-27T10:30:45.456Z] ERROR: Failed to fetch todos {"status":500}
```

### API Logging

API requests are automatically logged with timing information:

```typescript
// Automatically logged by fetchWithLogging wrapper
[2025-10-27T04:13:15.123Z] DEBUG: API Request: GET /api/todos?status=all
[2025-10-27T04:13:15.200Z] DEBUG: API Response: GET /api/todos?status=all - 200 (77.00ms)
```

**Error responses** (status >= 400) are logged as warnings:

```
[2025-10-27T04:13:15.300Z] WARN: API Response: POST /api/auth/login - 401 (25.50ms)
```

**Network errors** are logged with full error details:

```
[2025-10-27T04:13:15.400Z] ERROR: API Error: POST /api/auth/login {"duration":150.25}
```

### Sensitive Data Masking

The logger automatically masks sensitive information in log messages:

**Masked Patterns**:

- `password`: `password='secret123'` → `password='***'`
- `token`: `token=abc123xyz` → `token='***'`
- `api_key` / `api-key`: `api_key: sk-123456` → `api_key='***'`
- `secret`: `secret="mysecret"` → `secret='***'`
- `authorization`: `Authorization: Bearer token123` → `Authorization: Bearer ***`

### Usage in Code

Import the logger and use appropriate log levels:

**Basic Setup**:

```typescript
import { logger } from '@/lib/logger'
```

**Log Levels and Guidelines**:

- **DEBUG**: Detailed execution flow, API requests/responses, performance metrics
  - Use for development debugging only
  - Automatically disabled in production (unless explicitly enabled)

- **INFO**: Important operations completed, user actions, state changes
  - Business-level operations (e.g., "User created todo", "Filter changed")
  - Component mount/unmount (use sparingly)

- **WARN**: Validation errors, deprecated features, fallback behaviors
  - User input validation failures
  - Non-critical errors that don't prevent functionality

- **ERROR**: Exceptions, unexpected failures, API errors
  - Always include error object for stack traces
  - Use for unrecoverable errors

**Examples by Layer**:

**Components** (`components/`, `pages/`):

```typescript
// User action (INFO)
logger.info('User logged in', { userId: user.id })

// Component error (ERROR)
logger.error('Failed to render LoginPage', error)
```

**API Layer** (`lib/api/`):

```typescript
// API calls are automatically logged by fetchWithLogging
// No manual logging needed for request/response

// Business logic error (ERROR)
logger.error('Failed to parse API response', error, { endpoint: '/api/auth/login' })
```

**Hooks** (`hooks/`):

```typescript
// State change (DEBUG)
logger.debug('Auth state updated', { isAuthenticated: true })

// Hook error (ERROR)
logger.error('useAuth hook error', error)
```

**Performance Measurement**:

```typescript
// Async operation
const result = await logger.measureAsync('User login', async () => {
  return await login(credentials)
})

// Sync operation
const validated = logger.measure(
  'Validate credentials',
  () => {
    return validateCredentials(email, password)
  },
  { email }
)
```

### Global Error Handling

**Uncaught Errors** (`window.onerror`):

- Catches synchronous errors not caught by try-catch
- Automatically logged with file, line, and column information
- Configured in `main.tsx`

**Unhandled Promise Rejections** (`window.onunhandledrejection`):

- Catches async errors not caught by try-catch
- Automatically logged with rejection reason
- Configured in `main.tsx`

**React Error Boundary** (`components/ErrorBoundary.tsx`):

- Catches errors during React rendering
- Displays user-friendly error UI with reload option
- Logs errors with component stack trace

### Environment-Specific Behavior

**Development** (`MODE=development`):

- **Log Level**: DEBUG (all logs shown)
- **API Logging**: Enabled by default
- **Output**: Browser console
- **Format**: Readable text with timestamps

**Production** (`MODE=production`):

- **Log Level**: WARN (only warnings and errors)
- **API Logging**: Disabled by default
- **Output**: Browser console
- **Format**: Structured logs ready for external services

**Testing** (`MODE=test`):

- **Log Level**: DEBUG
- **API Logging**: Disabled by default
- **Output**: Suppressed to reduce test noise

### Best Practices

1. **Don't log on every render**: Avoid DEBUG logs in render functions or frequently-called hooks
2. **Use appropriate levels**: DEBUG for development, INFO for user actions, WARN for recoverable errors, ERROR for failures
3. **Include context**: Add relevant metadata (IDs, states, counts) to log messages
4. **Avoid sensitive data**: The filter handles common patterns, but avoid logging user PII
5. **Use error objects**: Always pass error objects to `logger.error()` for stack traces
6. **Keep it concise**: Log messages should be clear and actionable
7. **Leverage automatic logging**: API calls are logged automatically, no need to log manually

## Environment Variables

Create a `frontend/.env` file for local development:

```env
VITE_API_PROXY=http://localhost:5000

# Logging configuration
VITE_LOG_LEVEL=DEBUG
VITE_ENABLE_API_LOGGING=true
```

**Note**: Vite only exposes variables prefixed with `VITE_` to the client-side code.
