import type { Todo, TodoDto, TodoPayload, TodoStatus, TodoUpdatePayload } from '@/types/todo'
import { fetchWithLogging, buildJsonHeaders, parseJson, buildApiError } from './client'

/**
 * API error class for handling HTTP errors
 */
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
  const response = await fetchWithLogging(`${API_BASE_URL}?status=${status}`, {
    headers: {
      Accept: 'application/json',
    },
  })
  const json = await parseJson(response)
  if (!response.ok) {
    throw buildApiError(response, json)
  }
  const items = ((json as { items?: TodoDto[] })?.items ?? []) as TodoDto[]
  return items.map(mapTodoDto)
}

export async function createTodo(payload: TodoPayload): Promise<Todo> {
  const response = await fetchWithLogging(API_BASE_URL, {
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
  const response = await fetchWithLogging(`${API_BASE_URL}/${id}`, {
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
  const response = await fetchWithLogging(`${API_BASE_URL}/${id}/complete`, {
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
  const response = await fetchWithLogging(`${API_BASE_URL}/${id}`, {
    method: 'DELETE',
  })
  if (!response.ok) {
    const json = await parseJson(response)
    throw buildApiError(response, json)
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
