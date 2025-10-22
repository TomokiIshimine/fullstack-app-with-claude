export type TodoStatus = 'all' | 'active' | 'completed'

export interface TodoDto {
  id: number
  title: string
  detail: string | null
  due_date: string | null
  is_completed: boolean
  created_at: string
  updated_at: string
}

export interface Todo {
  id: number
  title: string
  detail: string | null
  dueDate: string | null
  isCompleted: boolean
  createdAt: string
  updatedAt: string
}

export interface TodoPayload {
  title: string
  detail?: string | null
  dueDate?: string | null
}

export interface TodoUpdatePayload {
  title?: string
  detail?: string | null
  dueDate?: string | null
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(status: number, message: string, body: unknown = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

const API_BASE_URL = '/api/todos'

export async function getTodos(status: TodoStatus = 'all'): Promise<Todo[]> {
  const response = await fetch(`${API_BASE_URL}?status=${status}`, {
    headers: {
      Accept: 'application/json',
    },
  })
  const json = await parseJson(response)
  if (!response.ok) {
    throw buildApiError(response, json)
  }
  const items = (json?.items ?? []) as TodoDto[]
  return items.map(mapTodoDto)
}

export async function createTodo(payload: TodoPayload): Promise<Todo> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: buildJsonHeaders(),
    body: JSON.stringify(mapTodoPayload(payload)),
  })
  const json = await parseJson(response)
  if (!response.ok) {
    throw buildApiError(response, json)
  }
  return mapTodoDto(json as TodoDto)
}

export async function updateTodo(id: number, payload: TodoUpdatePayload): Promise<Todo> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PATCH',
    headers: buildJsonHeaders(),
    body: JSON.stringify(mapTodoPayload(payload)),
  })
  const json = await parseJson(response)
  if (!response.ok) {
    throw buildApiError(response, json)
  }
  return mapTodoDto(json as TodoDto)
}

export async function toggleTodo(id: number, isCompleted: boolean): Promise<Todo> {
  const response = await fetch(`${API_BASE_URL}/${id}/complete`, {
    method: 'PATCH',
    headers: buildJsonHeaders(),
    body: JSON.stringify({ is_completed: isCompleted }),
  })
  const json = await parseJson(response)
  if (!response.ok) {
    throw buildApiError(response, json)
  }
  return mapTodoDto(json as TodoDto)
}

export async function deleteTodo(id: number): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const json = await parseJson(response)
    throw buildApiError(response, json)
  }
}

function buildJsonHeaders(): HeadersInit {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

async function parseJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function mapTodoDto(dto: TodoDto): Todo {
  return {
    id: dto.id,
    title: dto.title,
    detail: dto.detail,
    dueDate: dto.due_date,
    isCompleted: dto.is_completed,
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
  }
}

function mapTodoPayload(payload: TodoPayload | TodoUpdatePayload): Record<string, unknown> {
  const body: Record<string, unknown> = {}

  if ('title' in payload && payload.title !== undefined) {
    body.title = payload.title
  }
  if ('detail' in payload && payload.detail !== undefined) {
    body.detail = payload.detail
  }
  if ('dueDate' in payload && payload.dueDate !== undefined) {
    body.due_date = payload.dueDate
  }

  return body
}

function buildApiError(response: Response, json: unknown): ApiError {
  if (isErrorResponse(json)) {
    return new ApiError(response.status, json.error.message ?? 'Request failed', json)
  }
  return new ApiError(response.status, response.statusText || 'Request failed', json)
}

function isErrorResponse(json: unknown): json is { error: { message?: string } } {
  return Boolean(json && typeof json === 'object' && 'error' in (json as Record<string, unknown>))
}
