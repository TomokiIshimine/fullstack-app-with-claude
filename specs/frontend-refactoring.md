# フロントエンドリファクタリング仕様書

**作成日**: 2025-11-09
**対象**: React + TypeScript フロントエンド実装
**目的**: コードの保守性向上、パフォーマンス改善、開発者体験の向上

---

## 1. 概要

### 1.1 現状分析

現在のフロントエンド実装は以下の構成で動作している：

**ページコンポーネント**:
- `LoginPage` - ログイン画面
- `TodoListPage` - TODO一覧・管理画面
- `UserManagementPage` - ユーザー管理画面（管理者専用）
- `SettingsPage` - 設定画面（パスワード変更）

**主要コンポーネント**:
- `TodoForm` - TODO追加/編集フォーム
- `TodoList`/`TodoItem` - TODO表示
- `TodoFilterToggle` - フィルター・ソート切り替え
- `ErrorBoundary` - エラーバウンダリー
- `ProtectedRoute` - 認証ルート保護
- `RoleBasedRedirect` - ロールベースリダイレクト

**状態管理**:
- `AuthContext` - 認証状態（グローバル）
- `useTodos` - TODO管理の状態とロジック
- `useTodoForm` - フォームの状態とバリデーション

**APIクライアント**:
- `client.ts` - 共通fetchラッパー
- `todos.ts` - TODO API
- `auth.ts` - 認証API
- `users.ts` - ユーザー管理API
- `password.ts` - パスワード変更API

### 1.2 リファクタリングの優先度

| 優先度 | カテゴリ | 影響範囲 | 難易度 |
|--------|----------|----------|--------|
| 🔴 高 | コードの重複排除 | 全ページ | 低 |
| 🔴 高 | エラーハンドリング統一 | 全体 | 中 |
| 🟡 中 | 状態管理の改善 | TODO機能 | 高 |
| 🟡 中 | 共通コンポーネント化 | 全体 | 中 |
| 🟢 低 | CSS管理の改善 | スタイル | 中 |
| 🟢 低 | パフォーマンス最適化 | 全体 | 低 |

---

## 2. 重大な問題点と改善策

### 2.1 コードの重複【優先度: 🔴 高】

#### 問題点

**ログアウト処理の重複**
`TodoListPage`、`UserManagementPage`、`SettingsPage` で同じログアウト処理が実装されている。

```typescript
// 各ページで重複している処理
const handleLogout = async () => {
  try {
    await logout()
    logger.info('Logout successful, redirecting to login')
    navigate('/login')
  } catch (error) {
    logger.error('Logout error', error as Error)
    navigate('/login')
  }
}
```

**該当ファイル**:
- `frontend/src/pages/TodoListPage.tsx:34-44`
- `frontend/src/pages/admin/UserManagementPage.tsx:48-58`
- `frontend/src/pages/SettingsPage.tsx:21-30`

#### 改善策

**カスタムフックの作成**: `hooks/useLogout.ts`

```typescript
// frontend/src/hooks/useLogout.ts
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { logger } from '@/lib/logger'

export function useLogout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      logger.info('Logout successful, redirecting to login')
      navigate('/login')
    } catch (error) {
      logger.error('Logout error', error as Error)
      // ログアウト失敗時でもログイン画面へ遷移
      navigate('/login')
    }
  }

  return { handleLogout }
}
```

**使用例**:

```typescript
// ページコンポーネントで使用
const { handleLogout } = useLogout()

<button onClick={handleLogout}>ログアウト</button>
```

**影響範囲**:
- TodoListPage
- UserManagementPage
- SettingsPage

**期待効果**:
- コード重複の削減（約30行削減）
- 保守性向上（変更箇所が1箇所に集約）
- テストの集約化

---

### 2.2 エラーハンドリングの一貫性【優先度: 🔴 高】

#### 問題点

**エラー表示UIが統一されていない**

各コンポーネントで異なるエラー表示パターンを使用している：

```typescript
// TodoListPage.tsx - インラインエラー表示
{error && (
  <div className="todo-error" role="alert">
    <span>{error}</span>
    <button onClick={() => { clearError(); void refresh() }}>
      再読み込み
    </button>
  </div>
)}

// UserManagementPage.tsx - 異なるスタイル
{error && (
  <div className="error-message" role="alert">
    {error}
    <button onClick={loadUsers} className="error-message__retry">
      再試行
    </button>
  </div>
)}

// LoginPage.tsx - またも異なるスタイル
{error && (
  <div className="error-message" role="alert">
    {error}
  </div>
)}
```

**該当ファイル**:
- `frontend/src/pages/TodoListPage.tsx:62-75`
- `frontend/src/pages/admin/UserManagementPage.tsx:91-98`
- `frontend/src/pages/LoginPage.tsx:43-46`

#### 改善策

**共通エラーコンポーネントの作成**: `components/ErrorMessage.tsx`

```typescript
// frontend/src/components/ErrorMessage.tsx
interface ErrorMessageProps {
  message: string
  onRetry?: () => void
  onDismiss?: () => void
  className?: string
}

export function ErrorMessage({
  message,
  onRetry,
  onDismiss,
  className = ''
}: ErrorMessageProps) {
  return (
    <div className={`error-message ${className}`} role="alert">
      <div className="error-message__content">
        <span className="error-message__icon">⚠️</span>
        <span className="error-message__text">{message}</span>
      </div>
      <div className="error-message__actions">
        {onRetry && (
          <button
            onClick={onRetry}
            className="error-message__retry"
            aria-label="再試行"
          >
            再試行
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="error-message__dismiss"
            aria-label="閉じる"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
```

**カスタムフックの作成**: `hooks/useErrorHandler.ts`

```typescript
// frontend/src/hooks/useErrorHandler.ts
import { useState, useCallback } from 'react'
import { ApiError } from '@/lib/api/todos'
import { logger } from '@/lib/logger'

export function useErrorHandler() {
  const [error, setError] = useState<string | null>(null)

  const handleError = useCallback((err: unknown, context?: string) => {
    const message = extractErrorMessage(err)
    setError(message)
    logger.error(context || 'Error occurred', err as Error)
  }, [])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return { error, handleError, clearError }
}

function extractErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'エラーが発生しました'
}
```

**使用例**:

```typescript
// ページコンポーネントで使用
const { error, handleError, clearError } = useErrorHandler()

// エラー発生時
try {
  await someApiCall()
} catch (err) {
  handleError(err, 'Failed to load data')
}

// 表示
{error && (
  <ErrorMessage
    message={error}
    onRetry={() => { clearError(); refresh() }}
    onDismiss={clearError}
  />
)}
```

**影響範囲**:
- 全ページコンポーネント
- 全APIクライアント呼び出し箇所

**期待効果**:
- UI/UXの統一
- エラーハンドリングロジックの集約
- アクセシビリティ向上
- テストの容易化

---

### 2.3 `useTodos` フックの複雑化【優先度: 🟡 中】

#### 問題点

**責務が多すぎる**

`useTodos` が19個の戻り値を持ち、以下の責務を全て担っている：

1. TODO一覧の取得とキャッシュ
2. フィルター状態管理
3. ソート状態管理
4. 編集状態管理
5. CRUD操作（作成、更新、削除、完了切り替え）
6. エラー状態管理
7. ローディング状態管理

```typescript
// frontend/src/hooks/useTodos.ts:7-26
export interface UseTodosResult {
  todos: Todo[]                    // フィルター済みTODO一覧
  totalCount: number               // 総数
  activeCount: number              // 未完了数
  completedCount: number           // 完了数
  status: TodoStatus               // フィルター状態
  sortOrder: SortOrder             // ソート順
  isLoading: boolean               // ローディング状態
  error: string | null             // エラーメッセージ
  editingTodo: Todo | null         // 編集中TODO
  refresh: () => Promise<void>     // 再読み込み
  clearError: () => void           // エラークリア
  setStatus: (status: TodoStatus) => void        // フィルター変更
  toggleSortOrder: () => void                    // ソート切り替え
  startEditing: (todo: Todo) => void             // 編集開始
  cancelEditing: () => void                      // 編集キャンセル
  submitTodo: (payload: TodoPayload | TodoUpdatePayload) => Promise<void>  // 作成/更新
  deleteTodo: (id: number) => Promise<void>      // 削除
  toggleTodoCompletion: (id: number, isCompleted: boolean) => Promise<void>  // 完了切り替え
}
```

**該当ファイル**:
- `frontend/src/hooks/useTodos.ts:28-155`

#### 改善策

**責務を分割したフックの作成**

##### (A) データ取得専用フック: `hooks/useTodoData.ts`

```typescript
// frontend/src/hooks/useTodoData.ts
import { useState, useCallback, useEffect } from 'react'
import { getTodos, type Todo } from '@/lib/api/todos'

export function useTodoData() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadTodos = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const items = await getTodos('all')
      setTodos(items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'データ取得に失敗しました')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTodos()
  }, [loadTodos])

  return {
    todos,
    isLoading,
    error,
    reload: loadTodos,
    setTodos
  }
}
```

##### (B) フィルター/ソート専用フック: `hooks/useTodoFilters.ts`

```typescript
// frontend/src/hooks/useTodoFilters.ts
import { useState, useMemo, useCallback } from 'react'
import { filterByStatus, sortTodos } from '@/lib/utils/todoFilters'
import type { Todo, TodoStatus, SortOrder } from '@/types/todo'

export function useTodoFilters(todos: Todo[]) {
  const [status, setStatus] = useState<TodoStatus>('active')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')

  const filteredTodos = useMemo(() => {
    const filtered = filterByStatus(todos, status)
    return sortTodos(filtered, sortOrder)
  }, [todos, status, sortOrder])

  const counts = useMemo(() => ({
    total: todos.length,
    active: filterByStatus(todos, 'active').length,
    completed: filterByStatus(todos, 'completed').length,
  }), [todos])

  const toggleSortOrder = useCallback(() => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
  }, [])

  return {
    status,
    sortOrder,
    filteredTodos,
    counts,
    setStatus,
    toggleSortOrder,
  }
}
```

##### (C) CRUD操作専用フック: `hooks/useTodoMutations.ts`

```typescript
// frontend/src/hooks/useTodoMutations.ts
import { useCallback } from 'react'
import {
  createTodo,
  updateTodo,
  deleteTodo,
  toggleTodo,
  type TodoPayload,
  type TodoUpdatePayload
} from '@/lib/api/todos'

export function useTodoMutations(onSuccess?: () => Promise<void>) {
  const handleCreate = useCallback(async (payload: TodoPayload) => {
    await createTodo(payload)
    await onSuccess?.()
  }, [onSuccess])

  const handleUpdate = useCallback(async (id: number, payload: TodoUpdatePayload) => {
    await updateTodo(id, payload)
    await onSuccess?.()
  }, [onSuccess])

  const handleDelete = useCallback(async (id: number) => {
    await deleteTodo(id)
    await onSuccess?.()
  }, [onSuccess])

  const handleToggle = useCallback(async (id: number, isCompleted: boolean) => {
    await toggleTodo(id, isCompleted)
    await onSuccess?.()
  }, [onSuccess])

  return {
    createTodo: handleCreate,
    updateTodo: handleUpdate,
    deleteTodo: handleDelete,
    toggleTodo: handleToggle,
  }
}
```

##### (D) 編集状態管理フック: `hooks/useTodoEditor.ts`

```typescript
// frontend/src/hooks/useTodoEditor.ts
import { useState, useCallback } from 'react'
import type { Todo } from '@/types/todo'

export function useTodoEditor() {
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

  const startEditing = useCallback((todo: Todo) => {
    setEditingTodo(todo)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingTodo(null)
  }, [])

  return {
    editingTodo,
    isEditing: editingTodo !== null,
    startEditing,
    cancelEditing,
  }
}
```

##### (E) 統合フック: `hooks/useTodos.ts` (リファクタリング後)

```typescript
// frontend/src/hooks/useTodos.ts (リファクタリング後)
import { useTodoData } from './useTodoData'
import { useTodoFilters } from './useTodoFilters'
import { useTodoMutations } from './useTodoMutations'
import { useTodoEditor } from './useTodoEditor'
import type { TodoPayload, TodoUpdatePayload } from '@/types/todo'

export function useTodos() {
  // データ取得
  const { todos, isLoading, error, reload, setTodos } = useTodoData()

  // フィルター・ソート
  const {
    status,
    sortOrder,
    filteredTodos,
    counts,
    setStatus,
    toggleSortOrder
  } = useTodoFilters(todos)

  // 編集状態
  const { editingTodo, startEditing, cancelEditing } = useTodoEditor()

  // CRUD操作
  const mutations = useTodoMutations(reload)

  // 統合された送信処理
  const submitTodo = async (payload: TodoPayload | TodoUpdatePayload) => {
    if (editingTodo) {
      await mutations.updateTodo(editingTodo.id, payload as TodoUpdatePayload)
      cancelEditing()
    } else {
      await mutations.createTodo(payload as TodoPayload)
    }
  }

  return {
    // データ
    todos: filteredTodos,
    totalCount: counts.total,
    activeCount: counts.active,
    completedCount: counts.completed,
    isLoading,
    error,

    // フィルター・ソート
    status,
    sortOrder,
    setStatus,
    toggleSortOrder,

    // 編集
    editingTodo,
    startEditing,
    cancelEditing,

    // CRUD
    submitTodo,
    deleteTodo: mutations.deleteTodo,
    toggleTodoCompletion: mutations.toggleTodo,

    // その他
    refresh: reload,
    clearError: () => setTodos(todos), // エラーハンドリングは別フックで管理
  }
}
```

**影響範囲**:
- `frontend/src/hooks/useTodos.ts` (全面リファクタリング)
- `frontend/src/pages/TodoListPage.tsx` (変更なし - インターフェース互換性維持)

**期待効果**:
- 単一責任の原則に準拠
- テストの容易化（各フックを独立してテスト可能）
- 再利用性向上（他のコンポーネントで個別フックを使用可能）
- 保守性向上（変更箇所が特定しやすい）

---

### 2.4 共通レイアウトコンポーネントの不在【優先度: 🟡 中】

#### 問題点

**ページヘッダーのコードが重複**

各ページで類似のヘッダー実装が繰り返されている：

```typescript
// TodoListPage.tsx
<div className="todo-page__header">
  <h1 className="todo-page__title">TODOリスト</h1>
  <div className="todo-page__user-info">
    {user && <span className="user-email">{user.email}</span>}
    <button onClick={() => navigate('/settings')}>設定</button>
    <button onClick={handleLogout}>ログアウト</button>
  </div>
</div>

// UserManagementPage.tsx
<div className="user-management-page__header">
  <h1 className="user-management-page__title">ユーザー管理</h1>
  <div className="user-management-page__actions">
    <button onClick={() => navigate('/settings')}>設定</button>
    <button onClick={handleLogout}>ログアウト</button>
  </div>
</div>
```

**該当ファイル**:
- `frontend/src/pages/TodoListPage.tsx:49-60`
- `frontend/src/pages/admin/UserManagementPage.tsx:76-89`

#### 改善策

**共通ヘッダーコンポーネントの作成**: `components/AppHeader.tsx`

```typescript
// frontend/src/components/AppHeader.tsx
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useLogout } from '@/hooks/useLogout'

interface AppHeaderProps {
  title: string
  showUserInfo?: boolean
}

export function AppHeader({ title, showUserInfo = true }: AppHeaderProps) {
  const { user } = useAuth()
  const { handleLogout } = useLogout()
  const navigate = useNavigate()

  return (
    <header className="app-header">
      <h1 className="app-header__title">{title}</h1>
      <nav className="app-header__nav">
        {showUserInfo && user && (
          <span className="app-header__user">{user.email}</span>
        )}
        <button
          onClick={() => navigate('/settings')}
          className="app-header__button"
          aria-label="設定"
        >
          設定
        </button>
        <button
          onClick={handleLogout}
          className="app-header__button app-header__button--logout"
          aria-label="ログアウト"
        >
          ログアウト
        </button>
      </nav>
    </header>
  )
}
```

**ページレイアウトコンポーネントの作成**: `components/PageLayout.tsx`

```typescript
// frontend/src/components/PageLayout.tsx
import { ReactNode } from 'react'
import { AppHeader } from './AppHeader'
import { ErrorMessage } from './ErrorMessage'

interface PageLayoutProps {
  title: string
  children: ReactNode
  error?: string | null
  onRetry?: () => void
  showUserInfo?: boolean
  className?: string
}

export function PageLayout({
  title,
  children,
  error,
  onRetry,
  showUserInfo = true,
  className = ''
}: PageLayoutProps) {
  return (
    <div className={`page-layout ${className}`}>
      <AppHeader title={title} showUserInfo={showUserInfo} />

      <main className="page-layout__content">
        {error && <ErrorMessage message={error} onRetry={onRetry} />}
        {children}
      </main>
    </div>
  )
}
```

**使用例**:

```typescript
// TodoListPage.tsx (リファクタリング後)
export function TodoListPage() {
  const { todos, error, refresh, /* ... */ } = useTodos()

  return (
    <PageLayout
      title="TODOリスト"
      error={error}
      onRetry={refresh}
    >
      <TodoFilterToggle {...filterProps} />
      <div className="todo-layout">
        <TodoList {...listProps} />
        <TodoForm {...formProps} />
      </div>
    </PageLayout>
  )
}
```

**影響範囲**:
- TodoListPage
- UserManagementPage
- SettingsPage

**期待効果**:
- コード重複の大幅削減（約40行削減/ページ）
- デザインの統一性向上
- レスポンシブ対応の一元管理
- アクセシビリティの統一

---

## 3. 中程度の問題点と改善策

### 3.1 API型安全性の不足【優先度: 🟡 中】

#### 問題点

**手動マッピング関数によるエラーの可能性**

API応答を手動でマッピングしており、ランタイム型チェックがない。

```typescript
// frontend/src/lib/api/todos.ts:84-94
function mapTodoDto(dto: TodoDto): Todo {
  return {
    id: dto.id,
    title: dto.title,
    detail: dto.detail,
    dueDate: dto.due_date,  // スネークケース → キャメルケース
    isCompleted: dto.is_completed,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}
```

#### 改善策

**Zodスキーマバリデーションの導入**

```bash
pnpm --dir frontend add zod
```

```typescript
// frontend/src/lib/api/schemas/todo.ts
import { z } from 'zod'

// DTOスキーマ（API応答）
export const TodoDtoSchema = z.object({
  id: z.number(),
  title: z.string(),
  detail: z.string().nullable(),
  due_date: z.string().nullable(),
  is_completed: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type TodoDto = z.infer<typeof TodoDtoSchema>

// クライアント側型（変換後）
export const TodoSchema = TodoDtoSchema.transform(dto => ({
  id: dto.id,
  title: dto.title,
  detail: dto.detail,
  dueDate: dto.due_date,
  isCompleted: dto.is_completed,
  createdAt: dto.created_at,
  updatedAt: dto.updated_at,
}))

export type Todo = z.infer<typeof TodoSchema>

// リスト応答スキーマ
export const TodoListResponseSchema = z.object({
  items: z.array(TodoDtoSchema),
})
```

```typescript
// frontend/src/lib/api/todos.ts (リファクタリング後)
import { TodoDtoSchema, TodoListResponseSchema } from './schemas/todo'

export async function getTodos(status: TodoStatus = 'all'): Promise<Todo[]> {
  const response = await fetchWithLogging(`${API_BASE_URL}?status=${status}`)
  const json = await parseJson(response)

  if (!response.ok) {
    throw buildApiError(response, json)
  }

  // ランタイム型チェック
  const validated = TodoListResponseSchema.parse(json)
  return validated.items.map(dto => TodoSchema.parse(dto))
}
```

**期待効果**:
- ランタイム型安全性の保証
- APIレスポンスの破損検出
- 型エラーの早期発見
- ドキュメント性の向上

---

### 3.2 CSS管理の分散【優先度: 🟢 低】

#### 問題点

**グローバルCSSによる名前空間汚染リスク**

現在、`src/styles/todo.css` でグローバルCSSを使用しており、クラス名の衝突リスクがある。

```css
/* frontend/src/styles/todo.css */
.todo-page { /* ... */ }
.todo-list { /* ... */ }
.todo-item { /* ... */ }
```

#### 改善策

**CSS Modulesの導入**

```typescript
// frontend/src/pages/TodoListPage.module.css
.page {
  padding: 2rem;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.title {
  font-size: 2rem;
  font-weight: bold;
}
```

```typescript
// frontend/src/pages/TodoListPage.tsx
import styles from './TodoListPage.module.css'

export function TodoListPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>TODOリスト</h1>
      </header>
    </div>
  )
}
```

**または、CSS-in-JSの導入（styled-components / emotion）**

```bash
pnpm --dir frontend add @emotion/react @emotion/styled
```

```typescript
// frontend/src/components/TodoItem.styles.ts
import styled from '@emotion/styled'

export const TodoItemContainer = styled.li<{ isCompleted: boolean }>`
  padding: 1rem;
  border-bottom: 1px solid #e0e0e0;
  background-color: ${props => props.isCompleted ? '#f5f5f5' : 'white'};

  &:hover {
    background-color: #fafafa;
  }
`

export const TodoTitle = styled.span<{ isCompleted: boolean }>`
  text-decoration: ${props => props.isCompleted ? 'line-through' : 'none'};
  color: ${props => props.isCompleted ? '#999' : '#333'};
`
```

**期待効果**:
- クラス名の衝突防止
- コンポーネントとスタイルの結合度向上
- 削除時の安全性向上（未使用CSSの検出）
- TypeScript型サポート

---

### 3.3 パフォーマンス最適化【優先度: 🟢 低】

#### 問題点

**不要な再レンダリングの可能性**

`TodoItem` コンポーネントがメモ化されておらず、親の再レンダリング時に全アイテムが再レンダリングされる。

```typescript
// frontend/src/components/TodoList.tsx:43-78
function TodoItem({ todo, onToggle, onEdit, onDelete }: TodoItemProps) {
  const handleToggle = () => onToggle(todo, !todo.isCompleted)
  const handleEdit = () => onEdit(todo)
  const handleDelete = () => onDelete(todo)

  return (
    <li className={`todo-item${todo.isCompleted ? ' is-completed' : ''}`}>
      {/* ... */}
    </li>
  )
}
```

#### 改善策

**React.memoの適用**

```typescript
// frontend/src/components/TodoList.tsx (リファクタリング後)
import { memo } from 'react'

const TodoItem = memo(function TodoItem({
  todo,
  onToggle,
  onEdit,
  onDelete
}: TodoItemProps) {
  const handleToggle = () => onToggle(todo, !todo.isCompleted)
  const handleEdit = () => onEdit(todo)
  const handleDelete = () => onDelete(todo)

  return (
    <li className={`todo-item${todo.isCompleted ? ' is-completed' : ''}`}>
      {/* ... */}
    </li>
  )
}, (prevProps, nextProps) => {
  // カスタム比較関数（必要に応じて）
  return (
    prevProps.todo.id === nextProps.todo.id &&
    prevProps.todo.isCompleted === nextProps.todo.isCompleted &&
    prevProps.todo.title === nextProps.todo.title &&
    prevProps.todo.detail === nextProps.todo.detail &&
    prevProps.todo.dueDate === nextProps.todo.dueDate
  )
})
```

**コールバックのメモ化**

```typescript
// frontend/src/pages/TodoListPage.tsx
import { useCallback } from 'react'

const handleToggle = useCallback((todo: Todo, nextState: boolean) => {
  void toggleTodoCompletion(todo.id, nextState)
}, [toggleTodoCompletion])

const handleEdit = useCallback((todo: Todo) => {
  startEditing(todo)
}, [startEditing])

const handleDelete = useCallback((todo: Todo) => {
  void deleteTodoById(todo.id)
}, [deleteTodoById])
```

**期待効果**:
- リスト表示のパフォーマンス向上
- 大量TODOアイテムでの快適な操作
- メモリ使用量の最適化

---

## 4. アクセシビリティ改善【優先度: 🟡 中】

### 4.1 キーボードナビゲーション

#### 問題点

**Enterキーでのフォーム送信対応不足**

フォーム内でEnterキーを押した際の動作が一貫していない。

#### 改善策

```typescript
// frontend/src/components/TodoForm.tsx
<form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
  {/* ... */}
</form>

const handleKeyDown = (e: React.KeyboardEvent) => {
  if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
    e.preventDefault()
    handleSubmit(e as unknown as React.FormEvent)
  }
}
```

### 4.2 ARIAラベルの拡充

```typescript
// frontend/src/components/TodoFilterToggle.tsx
<div className="todo-filter" role="radiogroup" aria-label="TODOフィルター">
  <button
    role="radio"
    aria-checked={status === 'all'}
    onClick={() => onStatusChange('all')}
  >
    すべて ({totalCount})
  </button>
  <button
    role="radio"
    aria-checked={status === 'active'}
    onClick={() => onStatusChange('active')}
  >
    未完了 ({activeCount})
  </button>
  <button
    role="radio"
    aria-checked={status === 'completed'}
    onClick={() => onStatusChange('completed')}
  >
    完了 ({completedCount})
  </button>
</div>
```

---

## 5. テストの拡充【優先度: 🟡 中】

### 5.1 E2Eテストの追加

**Playwrightを使用したE2Eテストの実装**

```typescript
// frontend/e2e/todo.spec.ts
import { test, expect } from '@playwright/test'

test.describe('TODO機能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'user@example.com')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL('/todos')
  })

  test('TODOの作成', async ({ page }) => {
    await page.fill('input[name="title"]', 'テストTODO')
    await page.fill('textarea[name="detail"]', '詳細説明')
    await page.click('button[type="submit"]')

    await expect(page.locator('.todo-item')).toContainText('テストTODO')
  })

  test('TODOの完了切り替え', async ({ page }) => {
    await page.locator('.todo-item input[type="checkbox"]').first().click()
    await expect(page.locator('.todo-item').first()).toHaveClass(/is-completed/)
  })

  test('TODOの削除', async ({ page }) => {
    const initialCount = await page.locator('.todo-item').count()
    await page.locator('.todo-item button.danger').first().click()
    await expect(page.locator('.todo-item')).toHaveCount(initialCount - 1)
  })
})
```

### 5.2 インテグレーションテストの追加

```typescript
// frontend/src/pages/TodoListPage.integration.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TodoListPage } from './TodoListPage'
import { AuthProvider } from '@/contexts/AuthContext'
import { BrowserRouter } from 'react-router-dom'

// MSWでAPIモック
import { setupServer } from 'msw/node'
import { rest } from 'msw'

const server = setupServer(
  rest.get('/api/todos', (req, res, ctx) => {
    return res(ctx.json({ items: [] }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('TODO一覧ページの統合テスト', async () => {
  render(
    <BrowserRouter>
      <AuthProvider>
        <TodoListPage />
      </AuthProvider>
    </BrowserRouter>
  )

  // 初期表示確認
  expect(screen.getByRole('heading', { name: 'TODOリスト' })).toBeInTheDocument()

  // TODO追加
  const user = userEvent.setup()
  await user.type(screen.getByLabelText('タイトル'), 'テストTODO')
  await user.click(screen.getByRole('button', { name: '追加' }))

  // 追加されたことを確認
  await waitFor(() => {
    expect(screen.getByText('テストTODO')).toBeInTheDocument()
  })
})
```

---

## 6. 実装優先順位と段階的アプローチ

### フェーズ1: 即座に実装可能（1-2日）

1. ✅ `useLogout` フックの作成
2. ✅ `ErrorMessage` コンポーネントの作成
3. ✅ `useErrorHandler` フックの作成
4. ✅ 各ページでの適用

**期待削減コード量**: 約100行

### フェーズ2: 短期改善（3-5日）

1. ✅ `AppHeader` と `PageLayout` コンポーネントの作成
2. ✅ 各ページのリファクタリング
3. ✅ CSS Modulesへの移行

**期待削減コード量**: 約150行

### フェーズ3: 中期改善（1-2週間）

1. ✅ `useTodos` フックの分割
2. ✅ Zodスキーマバリデーションの導入
3. ✅ パフォーマンス最適化（React.memo適用）

**期待削減コード量**: 約80行
**期待品質向上**: 型安全性、パフォーマンス

### フェーズ4: 長期改善（2-4週間）

1. ✅ E2Eテストの追加
2. ✅ インテグレーションテストの拡充
3. ✅ アクセシビリティ監査と改善

**期待テストカバレッジ**: 80%以上

---

## 7. リスク評価

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|----------|------|
| 既存機能の破損 | 高 | 中 | 十分なテストカバレッジ、段階的リリース |
| パフォーマンス低下 | 中 | 低 | React DevToolsでのプロファイリング |
| 型エラーの増加 | 低 | 中 | Zod導入による型安全性向上 |
| CSSの衝突 | 中 | 低 | CSS Modules導入 |
| 開発速度の一時低下 | 中 | 高 | ペアプログラミング、知識共有 |

---

## 8. 成功指標（KPI）

| 指標 | 現状 | 目標 | 測定方法 |
|------|------|------|----------|
| コード行数 | 約2,000行 | 約1,650行 | `cloc frontend/src` |
| テストカバレッジ | 約65% | 80%以上 | `vitest --coverage` |
| 重複コード率 | 約15% | 5%以下 | `jscpd` |
| バンドルサイズ | 未測定 | ベースライン確立 | `vite build --analyze` |
| ビルド時間 | 未測定 | ベースライン確立 | `time pnpm run build` |
| Lighthouse スコア | 未測定 | 90以上 | Chrome DevTools |

---

## 9. 参考リソース

- [React公式ドキュメント - フック](https://react.dev/reference/react)
- [TypeScript Deep Dive](https://basarat.gitbook.io/typescript/)
- [Zod - TypeScript-first schema validation](https://zod.dev/)
- [CSS Modules](https://github.com/css-modules/css-modules)
- [Playwright](https://playwright.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Web Accessibility Initiative (WAI)](https://www.w3.org/WAI/)

---

## 10. まとめ

本リファクタリングにより、以下を実現する：

1. **保守性の向上**: コード重複削減、責務の明確化
2. **型安全性の向上**: Zodによるランタイム検証
3. **開発者体験の向上**: 一貫したパターン、テスト容易性
4. **ユーザー体験の向上**: パフォーマンス、アクセシビリティ
5. **品質の向上**: テストカバレッジ、静的解析

段階的アプローチにより、既存機能を壊すことなく、持続可能な改善を進める。
