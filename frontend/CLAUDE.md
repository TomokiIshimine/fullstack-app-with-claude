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
// Frontend makes request to /api/todos
// Vite proxies it to http://localhost:5000/api/todos
const response = await fetch('/api/todos')
```

### Component Organization

```
src/
├── pages/           # Page-level components (e.g., TodoListPage.tsx)
├── components/      # Reusable UI components (e.g., TodoForm.tsx, TodoList.tsx)
├── styles/          # CSS files (e.g., todo.css)
├── App.tsx          # Root component with routing
└── main.tsx         # Application entry point
```

**Component conventions:**

- Page components: `<FeatureName>Page.tsx` (e.g., `TodoListPage.tsx`)
- UI components: `<ComponentName>.tsx` (e.g., `TodoForm.tsx`, `TodoList.tsx`)
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

describe('TodoForm', () => {
  it('should submit form with valid input', () => {
    render(<TodoForm onSubmit={mockSubmit} />);

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'Test' } });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    expect(mockSubmit).toHaveBeenCalledWith('Test');
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

## Feature Implementation Example: TODO

The TODO feature demonstrates the full frontend stack:

### Files

- **Page**: `src/pages/TodoListPage.tsx` - Main TODO page
- **Components**:
  - `src/components/TodoForm.tsx` - Form for creating todos
  - `src/components/TodoList.tsx` - List of todos
  - `src/components/TodoItem.tsx` - Individual todo item
  - `src/components/TodoFilter.tsx` - Filter by status
- **Styles**: `src/styles/todo.css` - TODO-specific styles
- **Tests**: `src/**/*.test.tsx` - Component tests

### Implementation Pattern

1. **Define Types**

   ```typescript
   interface Todo {
     id: number
     title: string
     is_completed: boolean
   }

   type TodoStatus = 'active' | 'completed' | 'all'
   ```

2. **Create API Functions**

   ```typescript
   const fetchTodos = async (status: TodoStatus): Promise<Todo[]> => {
     const response = await fetch(`/api/todos?status=${status}`)
     return response.json()
   }

   const createTodo = async (title: string): Promise<Todo> => {
     const response = await fetch('/api/todos', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({ title }),
     })
     return response.json()
   }
   ```

3. **Build UI Components**

   ```typescript
   const TodoForm: React.FC<{ onSubmit: (title: string) => void }> = ({ onSubmit }) => {
     const [title, setTitle] = useState('');

     const handleSubmit = (e: React.FormEvent) => {
       e.preventDefault();
       if (title.trim()) {
         onSubmit(title);
         setTitle('');
       }
     };

     return (
       <form onSubmit={handleSubmit}>
         <input
           type="text"
           value={title}
           onChange={(e) => setTitle(e.target.value)}
           placeholder="Enter todo title"
         />
         <button type="submit">Add Todo</button>
       </form>
     );
   };
   ```

4. **Compose Page**

   ```typescript
   const TodoListPage: React.FC = () => {
     const [todos, setTodos] = useState<Todo[]>([]);
     const [status, setStatus] = useState<TodoStatus>('all');

     useEffect(() => {
       fetchTodos(status).then(setTodos);
     }, [status]);

     const handleCreate = async (title: string) => {
       const newTodo = await createTodo(title);
       setTodos([...todos, newTodo]);
     };

     return (
       <div>
         <TodoFilter status={status} onStatusChange={setStatus} />
         <TodoForm onSubmit={handleCreate} />
         <TodoList todos={todos} />
       </div>
     );
   };
   ```

5. **Write Tests**

   ```typescript
   describe('TodoForm', () => {
     it('should create a new todo on submit', async () => {
       const mockOnSubmit = vi.fn();
       render(<TodoForm onSubmit={mockOnSubmit} />);

       const input = screen.getByPlaceholderText('Enter todo title');
       await userEvent.type(input, 'New Todo');

       const button = screen.getByText('Add Todo');
       await userEvent.click(button);

       expect(mockOnSubmit).toHaveBeenCalledWith('New Todo');
     });
   });
   ```

## Environment Variables

Create a `frontend/.env` file for local development:

```env
VITE_API_PROXY=http://localhost:5000
```

**Note**: Vite only exposes variables prefixed with `VITE_` to the client-side code.
