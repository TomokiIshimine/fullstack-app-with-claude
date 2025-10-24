import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { TodoListPage } from '@/pages/TodoListPage'

const FUTURE_DATE = '2025-10-23'

describe('TodoListPage', () => {
  const originalFetch = globalThis.fetch
  const fetchMock = vi.fn()
  let fetchQueue: Array<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>

  beforeAll(() => {
    Object.assign(globalThis, { fetch: fetchMock as unknown as typeof fetch })
  })

  beforeEach(() => {
    fetchQueue = []
    fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const next = fetchQueue.shift()
      if (!next) {
        throw new Error(`Unexpected fetch call: ${String(input)} ${JSON.stringify(init)}`)
      }
      return next(input, init)
    })
  })

  afterEach(() => {
    fetchMock.mockReset()
    fetchQueue = []
  })

  afterAll(() => {
    Object.assign(globalThis, { fetch: originalFetch })
  })

  it('allows creating, completing, and deleting todos', async () => {
    const user = userEvent.setup()

    enqueueGetTodos([])

    render(<TodoListPage />)

    await screen.findByText('表示できるTODOはありません')

    const detailInput = screen.getByLabelText('詳細')
    const titleInput = screen.getByLabelText('タイトル')
    const dueInput = screen.getByLabelText('期限')
    await user.type(titleInput, '新しいタスク')
    await user.type(detailInput, '詳細メモ')
    await user.type(dueInput, FUTURE_DATE)

    const createdTodo = buildTodoDto({
      id: 1,
      title: '新しいタスク',
      detail: '詳細メモ',
      due_date: FUTURE_DATE,
      is_completed: false,
    })

    enqueueCreateTodo(createdTodo)
    enqueueGetTodos([createdTodo])

    await user.click(screen.getByRole('button', { name: '追加' }))

    await screen.findByText('新しいタスク')

    const checkbox = screen.getByRole('checkbox', { name: /新しいタスク を完了にする/ })

    const completedTodo = buildTodoDto({
      ...createdTodo,
      is_completed: true,
    })

    enqueueToggleTodo(completedTodo.id, true, completedTodo)
    enqueueGetTodos([completedTodo])

    await user.click(checkbox)

    await screen.findByText('表示できるTODOはありません')

    await user.click(screen.getByRole('button', { name: '完了' }))

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /新しいタスク を未完了に戻す/ })).toBeChecked()
    })

    enqueueDeleteTodo(completedTodo.id)
    enqueueGetTodos([])

    await user.click(screen.getByRole('button', { name: '削除' }))

    await screen.findByText('表示できるTODOはありません')

    expect(fetchQueue).toHaveLength(0)
  })

  function enqueueGetTodos(items: Array<Record<string, unknown>>) {
    fetchQueue.push(async (input, init) => {
      expect(input.toString()).toContain('/api/todos?status=all')
      expect(init?.method ?? 'GET').toBe('GET')
      return jsonResponse({ items, meta: { count: items.length } })
    })
  }

  function enqueueCreateTodo(dto: Record<string, unknown>) {
    fetchQueue.push(async (input, init) => {
      expect(input.toString()).toBe('/api/todos')
      expect(init?.method).toBe('POST')
      const body = JSON.parse(String(init?.body))
      expect(body).toMatchObject({
        title: dto.title,
        detail: dto.detail,
        due_date: dto.due_date,
      })
      return jsonResponse(dto, { status: 201 })
    })
  }

  function enqueueToggleTodo(id: number, nextState: boolean, dto: Record<string, unknown>) {
    fetchQueue.push(async (input, init) => {
      expect(input.toString()).toBe(`/api/todos/${id}/complete`)
      expect(init?.method).toBe('PATCH')
      const body = JSON.parse(String(init?.body))
      expect(body).toEqual({ is_completed: nextState })
      return jsonResponse(dto)
    })
  }

  function enqueueDeleteTodo(id: number) {
    fetchQueue.push(async (input, init) => {
      expect(input.toString()).toBe(`/api/todos/${id}`)
      expect(init?.method).toBe('DELETE')
      return new Response(null, { status: 204 })
    })
  }
})

function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: {
      'Content-Type': 'application/json',
    },
    ...init,
  })
}

function buildTodoDto({
  id,
  title,
  detail,
  due_date,
  is_completed,
}: {
  id: number
  title: string
  detail: string | null
  due_date: string | null
  is_completed: boolean
}) {
  const baseTimestamp = '2025-10-22T00:00:00Z'
  return {
    id,
    title,
    detail,
    due_date,
    is_completed,
    created_at: baseTimestamp,
    updated_at: baseTimestamp,
  }
}
