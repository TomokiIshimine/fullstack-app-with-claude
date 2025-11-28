import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { PageHeader } from './PageHeader'

// useLogout フックのモック
const mockHandleLogout = vi.fn()
vi.mock('@/hooks/useLogout', () => ({
  useLogout: () => ({
    handleLogout: mockHandleLogout,
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
    mockHandleLogout.mockClear()
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

    it('ハンバーガーメニューボタンが表示される', () => {
      renderPageHeader({ title: 'テストページ' })

      expect(screen.getByRole('button', { name: 'メニューを開く' })).toBeInTheDocument()
    })
  })

  describe('ハンバーガーメニュー', () => {
    it('メニューボタンをクリックするとドロップダウンが開く', async () => {
      const user = userEvent.setup()
      renderPageHeader({ title: 'テストページ', showLogout: true })

      const menuButton = screen.getByRole('button', { name: 'メニューを開く' })
      await user.click(menuButton)

      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('メニューが開いている時にもう一度クリックすると閉じる', async () => {
      const user = userEvent.setup()
      renderPageHeader({ title: 'テストページ', showLogout: true })

      const menuButton = screen.getByRole('button', { name: 'メニューを開く' })
      await user.click(menuButton)
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await user.click(menuButton)
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('Escapeキーでメニューが閉じる', async () => {
      const user = userEvent.setup()
      renderPageHeader({ title: 'テストページ', showLogout: true })

      const menuButton = screen.getByRole('button', { name: 'メニューを開く' })
      await user.click(menuButton)
      expect(screen.getByRole('menu')).toBeInTheDocument()

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('aria-expanded属性が正しく設定される', async () => {
      const user = userEvent.setup()
      renderPageHeader({ title: 'テストページ', showLogout: true })

      const menuButton = screen.getByRole('button', { name: 'メニューを開く' })
      expect(menuButton).toHaveAttribute('aria-expanded', 'false')

      await user.click(menuButton)
      expect(menuButton).toHaveAttribute('aria-expanded', 'true')
    })
  })

  describe('ユーザー情報表示', () => {
    it('ユーザー名がある場合、名前が表示される', async () => {
      const user = userEvent.setup()
      renderPageHeader({
        title: 'テストページ',
        user: { name: '山田太郎', email: 'test@example.com' },
      })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      expect(screen.getByText('山田太郎')).toBeInTheDocument()
      expect(screen.queryByText('test@example.com')).not.toBeInTheDocument()
    })

    it('ユーザー名がない場合、メールアドレスが表示される', async () => {
      const user = userEvent.setup()
      renderPageHeader({
        title: 'テストページ',
        user: { name: null, email: 'test@example.com' },
      })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      expect(screen.getByText('test@example.com')).toBeInTheDocument()
    })

    it('ユーザーが渡されない場合は表示されない', async () => {
      const user = userEvent.setup()
      renderPageHeader({ title: 'テストページ', showLogout: true })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

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
    it('showSettings=true の場合にメニュー内に設定ボタンが表示される', async () => {
      const user = userEvent.setup()
      renderPageHeader({
        title: 'テストページ',
        showSettings: true,
      })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      expect(screen.getByRole('menuitem', { name: '設定' })).toBeInTheDocument()
    })

    it('設定ボタンをクリックすると /settings に遷移しメニューが閉じる', async () => {
      const user = userEvent.setup()
      renderPageHeader({
        title: 'テストページ',
        showSettings: true,
      })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))
      await user.click(screen.getByRole('menuitem', { name: '設定' }))

      expect(mockNavigate).toHaveBeenCalledWith('/settings')
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('showSettings=false の場合は設定ボタンが表示されない', async () => {
      const user = userEvent.setup()
      renderPageHeader({
        title: 'テストページ',
        showSettings: false,
        showLogout: true,
      })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      expect(screen.queryByRole('menuitem', { name: '設定' })).not.toBeInTheDocument()
    })
  })

  describe('ログアウトボタン', () => {
    it('showLogout=true の場合にメニュー内にログアウトボタンが表示される', async () => {
      const user = userEvent.setup()
      renderPageHeader({
        title: 'テストページ',
        showLogout: true,
      })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      expect(screen.getByRole('menuitem', { name: 'ログアウト' })).toBeInTheDocument()
    })

    it('ログアウトボタンをクリックするとhandleLogoutが呼ばれメニューが閉じる', async () => {
      const user = userEvent.setup()
      renderPageHeader({
        title: 'テストページ',
        showLogout: true,
      })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))
      await user.click(screen.getByRole('menuitem', { name: 'ログアウト' }))

      expect(mockHandleLogout).toHaveBeenCalledOnce()
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('showLogout=false の場合はログアウトボタンが表示されない', async () => {
      const user = userEvent.setup()
      renderPageHeader({
        title: 'テストページ',
        showLogout: false,
        showSettings: true,
      })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      expect(screen.queryByRole('menuitem', { name: 'ログアウト' })).not.toBeInTheDocument()
    })
  })

  describe('バージョン表示', () => {
    it('バージョン情報がメニュー内に正しく表示される', async () => {
      const user = userEvent.setup()
      mockUseVersion.mockReturnValue({
        version: 'v1.2.3',
        isLoading: false,
      })

      renderPageHeader({ title: 'テストページ', showLogout: true })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      expect(screen.getByText('v1.2.3')).toBeInTheDocument()
    })

    it('ローディング中はバージョンが表示されない', async () => {
      const user = userEvent.setup()
      mockUseVersion.mockReturnValue({
        version: 'v1.0.0',
        isLoading: true,
      })

      renderPageHeader({ title: 'テストページ', showLogout: true })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      expect(screen.queryByText('v1.0.0')).not.toBeInTheDocument()
    })

    it('バージョンが "unknown" の場合も表示される', async () => {
      const user = userEvent.setup()
      mockUseVersion.mockReturnValue({
        version: 'unknown',
        isLoading: false,
      })

      renderPageHeader({ title: 'テストページ', showLogout: true })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      expect(screen.getByText('unknown')).toBeInTheDocument()
    })

    it('バージョンはユーザー名の上に表示される', async () => {
      const user = userEvent.setup()
      mockUseVersion.mockReturnValue({
        version: 'v2.0.0',
        isLoading: false,
      })

      renderPageHeader({
        title: 'テストページ',
        user: { name: '山田太郎', email: 'test@example.com' },
      })

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      const version = screen.getByText('v2.0.0')
      const name = screen.getByText('山田太郎')
      const infoContainer = version.parentElement

      expect(infoContainer).toContainElement(version)
      expect(infoContainer).toContainElement(name)

      // Check that version appears before name in the DOM
      const children = Array.from(infoContainer?.children || [])
      const versionIndex = children.indexOf(version)
      const nameIndex = children.indexOf(name)
      expect(versionIndex).toBeLessThan(nameIndex)
    })

    it('異なるバージョン形式が正しく表示される', async () => {
      const user = userEvent.setup()
      const versions = ['v1.0.0', 'v2.1.0-beta.1', 'v3.0.0-rc.2']

      for (const version of versions) {
        mockUseVersion.mockReturnValue({
          version,
          isLoading: false,
        })

        const { unmount } = renderPageHeader({ title: 'テストページ', showLogout: true })

        await user.click(screen.getByRole('button', { name: 'メニューを開く' }))
        expect(screen.getByText(version)).toBeInTheDocument()

        unmount()
      }
    })
  })

  describe('複合パターン', () => {
    it('すべてのオプションを有効にした場合、すべての要素がメニュー内に表示される', async () => {
      const user = userEvent.setup()
      const handleBack = vi.fn()
      renderPageHeader({
        title: 'テストページ',
        user: { name: '山田太郎', email: 'test@example.com' },
        onBack: handleBack,
        showSettings: true,
        showLogout: true,
      })

      // 戻るボタンはヘッダーに表示
      expect(screen.getByRole('heading', { name: 'テストページ' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '戻る' })).toBeInTheDocument()

      // メニューを開く
      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      // メニュー内の要素
      expect(screen.getByText('山田太郎')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: '設定' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'ログアウト' })).toBeInTheDocument()
    })

    it('UserManagementPage パターン: タイトル、設定、ログアウト', async () => {
      const user = userEvent.setup()
      renderPageHeader({
        title: 'ユーザー管理',
        user: { name: '管理者', email: 'admin@example.com' },
        showSettings: true,
        showLogout: true,
      })

      expect(screen.getByRole('heading', { name: 'ユーザー管理' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '戻る' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      expect(screen.getByText('管理者')).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: '設定' })).toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'ログアウト' })).toBeInTheDocument()
    })

    it('SettingsPage パターン: タイトル、戻る、ログアウト', async () => {
      const user = userEvent.setup()
      const handleBack = vi.fn()
      renderPageHeader({
        title: '設定',
        user: { name: 'ユーザー', email: 'user@example.com' },
        onBack: handleBack,
        showLogout: true,
      })

      expect(screen.getByRole('heading', { name: '設定' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '戻る' })).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'メニューを開く' }))

      expect(screen.getByText('ユーザー')).toBeInTheDocument()
      expect(screen.queryByRole('menuitem', { name: '設定' })).not.toBeInTheDocument()
      expect(screen.getByRole('menuitem', { name: 'ログアウト' })).toBeInTheDocument()
    })
  })
})
