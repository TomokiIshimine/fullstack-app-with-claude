# Frontend Guide

This file provides guidance to Claude Code when working with the React + TypeScript frontend.

## Architecture Overview

### Build System

Vite with TypeScript. Uses `@` alias pointing to `src/` directory (configured in `vite.config.ts`).

**Configuration files:**

- `vite.config.ts` - Vite configuration
- `tsconfig.json` - TypeScript compiler options
- `eslint.config.js` - ESLint rules (flat config format)
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
  body: JSON.stringify({ email, password }),
})
```

### Component Organization

```
src/
├── pages/           # Page-level components (e.g., LoginPage.tsx)
├── components/
│   ├── ui/          # Shared UI component library (Button, Input, Alert, Modal)
│   ├── admin/       # Admin-specific components
│   ├── settings/    # Settings-specific components
│   └── ...          # Other reusable components (e.g., ProtectedRoute.tsx)
├── contexts/        # React Context (e.g., AuthContext.tsx)
├── styles/          # CSS files
├── App.tsx          # Root component with routing
└── main.tsx         # Application entry point
```

**Component conventions:**

- Page components: `<FeatureName>Page.tsx` (e.g., `LoginPage.tsx`)
- UI components: `<ComponentName>.tsx` (e.g., `ProtectedRoute.tsx`)
- Shared UI library: `components/ui/<ComponentName>.tsx` (e.g., `Button.tsx`, `Input.tsx`)
- One component per file
- Prefer Tailwind CSS utilities over custom CSS classes

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

# Formatting
pnpm --dir frontend run format
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

## UI Component Library

The project includes a shared UI component library in `src/components/ui/` built with **Tailwind CSS**. These components provide a consistent design system across the application.

### Available Components

#### Button (`components/ui/Button.tsx`)

A versatile button component with multiple variants, sizes, and loading states.

**Props:**

- `variant?: 'primary' | 'secondary' | 'danger' | 'success'` - Visual style (default: `'primary'`)
- `size?: 'sm' | 'md' | 'lg'` - Button size (default: `'md'`)
- `fullWidth?: boolean` - Expand to full width (default: `false`)
- `loading?: boolean` - Show loading spinner (default: `false`)
- All standard HTML button attributes

**Usage:**

```typescript
import { Button } from '@/components/ui'

// Primary button
<Button onClick={handleSubmit}>Submit</Button>

// Danger button with loading state
<Button variant="danger" loading={isDeleting} onClick={handleDelete}>
  Delete
</Button>

// Small secondary button
<Button variant="secondary" size="sm" onClick={handleCancel}>
  Cancel
</Button>
```

**Features:**

- Minimum tap target of 44px (accessibility)
- Loading spinner animation
- Disabled state with reduced opacity
- Focus ring for keyboard navigation

#### Input (`components/ui/Input.tsx`)

A form input component with label, error display, and password enhancements.

**Props:**

- `label?: string` - Input label
- `error?: string` - Error message to display
- `helperText?: string` - Helper text below input
- `fullWidth?: boolean` - Expand to full width (default: `false`)
- All standard HTML input attributes

**Usage:**

```typescript
import { Input } from '@/components/ui'

// Text input with label
<Input
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
/>

// Password input with error
<Input
  label="Password"
  type="password"
  value={password}
  onChange={(e) => setPassword(e.target.value)}
  error={passwordError}
  required
/>

// Input with helper text
<Input
  label="Name"
  helperText="Enter your full name"
  value={name}
  onChange={(e) => setName(e.target.value)}
/>
```

**Features:**

- **Password visibility toggle**: Automatic eye icon to show/hide password
- **CAPS LOCK detection**: Warning message when Caps Lock is on
- Integrated label and error display
- Required field indicator (\*)
- Minimum tap target of 44px

#### Alert (`components/ui/Alert.tsx`)

A versatile alert component for displaying success, error, warning, and info messages.

**Props:**

- `variant?: 'success' | 'error' | 'warning' | 'info'` - Alert type (default: `'info'`)
- `onDismiss?: () => void` - Callback when dismissed
- `onRetry?: () => void` - Show retry button with callback
- `autoCloseMs?: number` - Auto-close after specified milliseconds
- `className?: string` - Additional CSS classes

**Usage:**

```typescript
import { Alert } from '@/components/ui'

// Success message with auto-close
<Alert variant="success" autoCloseMs={5000} onDismiss={handleDismiss}>
  Profile updated successfully
</Alert>

// Error message with retry
<Alert variant="error" onRetry={handleRetry} onDismiss={handleDismiss}>
  Failed to save changes
</Alert>

// Warning message
<Alert variant="warning">
  This action cannot be undone
</Alert>
```

**Features:**

- Color-coded icons and backgrounds
- Optional dismiss button
- Optional retry button
- Auto-close timer
- Accessible `role="alert"`

#### Modal (`components/ui/Modal.tsx`)

A modal dialog component with customizable size and behavior.

**Props:**

- `isOpen: boolean` - Control modal visibility
- `onClose: () => void` - Callback when modal closes
- `title?: string` - Modal title
- `size?: 'sm' | 'md' | 'lg'` - Modal size (default: `'md'`)
- `closeOnOutsideClick?: boolean` - Close on backdrop click (default: `true`)
- `showCloseButton?: boolean` - Show X button (default: `true`)
- `footer?: React.ReactNode` - Footer content (usually buttons)

**Usage:**

```typescript
import { Modal, Button } from '@/components/ui'

<Modal
  isOpen={showModal}
  onClose={handleClose}
  title="Confirm Deletion"
  size="sm"
>
  <p>Are you sure you want to delete this user?</p>
  <p className="text-red-600">This action cannot be undone.</p>
  <div className="flex gap-3 justify-end mt-6">
    <Button variant="secondary" onClick={handleClose}>
      Cancel
    </Button>
    <Button variant="danger" onClick={handleConfirm}>
      Delete
    </Button>
  </div>
</Modal>
```

**Features:**

- Backdrop with blur effect
- Escape key to close
- Click outside to close (configurable)
- Body scroll lock when open
- Smooth fade-in animation
- Accessible `role="dialog"`

### Design System

**Color Palette:**

- **Primary**: Blue (`blue-500`, `blue-600`, `blue-700`)
- **Danger**: Red (`red-500`, `red-600`, `red-700`)
- **Success**: Emerald (`emerald-500`, `emerald-600`)
- **Warning**: Amber (`amber-500`, `amber-600`)
- **Neutral**: Slate (`slate-50` to `slate-900`)

**Spacing:**

- Follow Tailwind's spacing scale (`p-4`, `mb-6`, `gap-3`, etc.)
- Use `space-y-*` for vertical stacking

**Typography:**

- Headings: `text-2xl font-semibold` or `text-3xl font-bold`
- Body: `text-sm` or `text-base`
- Labels: `text-sm font-medium`

**Borders & Shadows:**

- Rounded corners: `rounded-lg` (8px) or `rounded-xl` (12px)
- Shadows: `shadow-md` for cards, `shadow-lg` for modals

### Styling Guidelines

**Prefer Tailwind utilities over custom CSS:**

```typescript
// ✅ Good - Use Tailwind classes
<div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-md">
  <span className="text-gray-700">Content</span>
</div>

// ❌ Avoid - Custom CSS classes
<div className="custom-card">
  <span className="custom-text">Content</span>
</div>
```

**Responsive Design:**

```typescript
// Use Tailwind's responsive prefixes
<div className="px-4 py-8 sm:px-6 lg:px-8">
  <h1 className="text-2xl sm:text-3xl lg:text-4xl">Title</h1>
</div>
```

**Accessibility:**

- Minimum tap target: 44px (use `min-h-[2.75rem]`)
- Proper ARIA attributes (`aria-label`, `aria-describedby`, `role`)
- Focus indicators (all interactive elements have focus rings)
- Semantic HTML (`<button>` not `<div onClick>`)

## Code Style Guidelines

### ESLint Rules

- **TypeScript rules**: Enforced via `@typescript-eslint`
- **React rules**: Enforced via `eslint-plugin-react`
- **Max warnings**: 0 (warnings treated as errors in CI)

### Prettier Configuration

- **Print width**: 100 characters
- **Tab width**: 2 spaces (default)
- **Semicolons**: Never (`semi: false`)
- **Single quotes**: true
- **Trailing commas**: es5
- **Arrow parens**: avoid

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
- **Styles**: `src/styles/page-header.css`, `src/styles/common.css` - Shared styles
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
   import { Input, Button } from '@/components/ui';

   const LoginForm: React.FC<{ onSubmit: (credentials: LoginCredentials) => void }> = ({ onSubmit }) => {
     const [email, setEmail] = useState('');
     const [password, setPassword] = useState('');

     const handleSubmit = (e: React.FormEvent) => {
       e.preventDefault();
       onSubmit({ email, password });
     };

     return (
       <form onSubmit={handleSubmit} className="space-y-4">
         <Input
           label="Email"
           type="email"
           value={email}
           onChange={(e) => setEmail(e.target.value)}
           placeholder="user@example.com"
           required
           fullWidth
         />
         <Input
           label="Password"
           type="password"
           value={password}
           onChange={(e) => setPassword(e.target.value)}
           placeholder="Enter your password"
           required
           fullWidth
         />
         <Button type="submit" fullWidth>Login</Button>
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
