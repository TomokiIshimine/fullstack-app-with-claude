import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { PageHeader } from './PageHeader'

// useLogout フックのモック
vi.mock('@/hooks/useLogout', () => ({
  useLogout: () => ({
    handleLogout: vi.fn(),
  }),
}))

// useVersion フックのモック（デフォルト値）
const mockUseVersion = vi.fn(() => ({
  version: 'v1.0.0',
  isLoading: false,
}))
vi.mock('@/hooks/useVersion', () => ({
  useVersion: () => mockUseVersion(),
}))

// useNavigate フックのモック
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('PageHeader', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    // Reset useVersion mock to default values
    mockUseVersion.mockReturnValue({
      version: 'v1.0.0',
      isLoading: false,
    })
  })

  const renderPageHeader = (props: React.ComponentProps<typeof PageHeader>) => {
    return render(
      <BrowserRouter>
        <PageHeader {...props} />
      </BrowserRouter>
    )
  }

  describe('基本表示', () => {
    it('タイトルが正しく表示される', () => {
      renderPageHeader({ title: 'テストページ' })

      expect(screen.getByRole('heading', { name: 'テストページ' })).toBeInTheDocument()
    })

    it('ユーザーメールが渡された場合に表示される', () => {
      renderPageHeader({
        title: 'テストページ',
        userEmail: 'test@example.com',
      })

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('ユーザーメールが渡されない場合は表示されない', () => {
      renderPageHeader({ title: 'テストページ' })

      expect(screen.queryByText(/@/)).not.toBeInTheDocument()
    })
  })

  describe('戻るボタン', () => {
    it('onBack が渡された場合に戻るボタンが表示される', () => {
      const handleBack = vi.fn()
      renderPageHeader({
        title: 'テストページ',
        onBack: handleBack,
      })

      expect(screen.getByRole('button', { name: '戻る' })).toBeInTheDocument()
    })

    it('戻るボタンをクリックするとコールバックが呼ばれる', async () => {
      const user = userEvent.setup()
      const handleBack = vi.fn()
      renderPageHeader({
        title: 'テストページ',
        onBack: handleBack,
      })

      await user.click(screen.getByRole('button', { name: '戻る' }))

      expect(handleBack).toHaveBeenCalledOnce()
    })

    it('onBack が渡されない場合は戻るボタンが表示されない', () => {
      renderPageHeader({ title: 'テストページ' })

      expect(screen.queryByRole('button', { name: '戻る' })).not.toBeInTheDocument()
    })
  })

  describe('設定ボタン', () => {
    it('showSettings=true の場合に設定ボタンが表示される', () => {
      renderPageHeader({
        title: 'テストページ',
        showSettings: true,
      })

      expect(screen.getByRole('button', { name: '設定' })).toBeInTheDocument()
    })

    it('設定ボタンをクリックすると /settings に遷移する', async () => {
      const user = userEvent.setup()
      renderPageHeader({
        title: 'テストページ',
        showSettings: true,
      })

      await user.click(screen.getByRole('button', { name: '設定' }))

      expect(mockNavigate).toHaveBeenCalledWith('/settings')
    })

    it('showSettings=false の場合は設定ボタンが表示されない', () => {
      renderPageHeader({
        title: 'テストページ',
        showSettings: false,
      })

      expect(screen.queryByRole('button', { name: '設定' })).not.toBeInTheDocument()
    })
  })

  describe('ログアウトボタン', () => {
    it('showLogout=true の場合にログアウトボタンが表示される', () => {
      renderPageHeader({
        title: 'テストページ',
        showLogout: true,
      })

      expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
    })

    it('showLogout=false の場合はログアウトボタンが表示されない', () => {
      renderPageHeader({
        title: 'テストページ',
        showLogout: false,
      })

      expect(screen.queryByRole('button', { name: 'ログアウト' })).not.toBeInTheDocument()
    })
  })

  describe('バージョン表示', () => {
    it('バージョン情報が正しく表示される', () => {
      mockUseVersion.mockReturnValue({
        version: 'v1.2.3',
        isLoading: false,
      })

      renderPageHeader({ title: 'テストページ' })

      expect(screen.getByText('v1.2.3')).toBeInTheDocument()
    })

    it('ローディング中はバージョンが表示されない', () => {
      mockUseVersion.mockReturnValue({
        version: 'v1.0.0',
        isLoading: true,
      })

      renderPageHeader({ title: 'テストページ' })

      expect(screen.queryByText('v1.0.0')).not.toBeInTheDocument()
    })

    it('バージョンが "unknown" の場合も表示される', () => {
      mockUseVersion.mockReturnValue({
        version: 'unknown',
        isLoading: false,
      })

      renderPageHeader({ title: 'テストページ' })

      expect(screen.getByText('unknown')).toBeInTheDocument()
    })

    it('バージョンはユーザーメールの左側に表示される', () => {
      mockUseVersion.mockReturnValue({
        version: 'v2.0.0',
        isLoading: false,
      })

      renderPageHeader({
        title: 'テストページ',
        userEmail: 'test@example.com',
      })

      const version = screen.getByText('v2.0.0')
      const email = screen.getByText('test@example.com')
      const actions = version.parentElement

      expect(actions).toContainElement(version)
      expect(actions).toContainElement(email)

      // Check that version appears before email in the DOM
      const children = Array.from(actions?.children || [])
      const versionIndex = children.indexOf(version)
      const emailIndex = children.indexOf(email)
      expect(versionIndex).toBeLessThan(emailIndex)
    })

    it('異なるバージョン形式が正しく表示される', () => {
      const versions = ['v1.0.0', 'v2.1.0-beta.1', 'v3.0.0-rc.2']

      versions.forEach(version => {
        mockUseVersion.mockReturnValue({
          version,
          isLoading: false,
        })

        const { unmount } = renderPageHeader({ title: 'テストページ' })

        expect(screen.getByText(version)).toBeInTheDocument()

        unmount()
      })
    })
  })

  describe('複合パターン', () => {
    it('すべてのオプションを有効にした場合、すべての要素が表示される', () => {
      const handleBack = vi.fn()
      renderPageHeader({
        title: 'テストページ',
        userEmail: 'test@example.com',
        onBack: handleBack,
        showSettings: true,
        showLogout: true,
      })

      expect(screen.getByRole('heading', { name: 'テストページ' })).toBeInTheDocument()
      expect(screen.getByText('test@example.com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '戻る' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '設定' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
    })

    it('TodoListPage パターン: タイトル、メール、設定、ログアウト', () => {
      renderPageHeader({
        title: 'TODOリスト',
        userEmail: 'user@example.com',
        showSettings: true,
        showLogout: true,
      })

      expect(screen.getByRole('heading', { name: 'TODOリスト' })).toBeInTheDocument()
      expect(screen.getByText('user@example.com')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '設定' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '戻る' })).not.toBeInTheDocument()
    })

    it('UserManagementPage パターン: タイトル、設定、ログアウト', () => {
      renderPageHeader({
        title: 'ユーザー管理',
        showSettings: true,
        showLogout: true,
      })

      expect(screen.getByRole('heading', { name: 'ユーザー管理' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '設定' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
      expect(screen.queryByText(/@/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '戻る' })).not.toBeInTheDocument()
    })

    it('SettingsPage パターン: タイトル、戻る、ログアウト', () => {
      const handleBack = vi.fn()
      renderPageHeader({
        title: '設定',
        onBack: handleBack,
        showLogout: true,
      })

      expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '戻る' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'ログアウト' })).toBeInTheDocument()
      expect(screen.queryByText(/@/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '設定' })).not.toBeInTheDocument()
    })
  })
})
