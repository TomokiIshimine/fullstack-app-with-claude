/**
 * Todo validation constraints
 */
export const TODO_VALIDATION = {
  TITLE_MAX_LENGTH: 120,
  DETAIL_MAX_LENGTH: 1000,
} as const

/**
 * Todo error messages
 */
export const TODO_ERROR_MESSAGES = {
  TITLE_REQUIRED: 'タイトルは必須です',
  TITLE_TOO_LONG: `タイトルは${TODO_VALIDATION.TITLE_MAX_LENGTH}文字以内で入力してください`,
  DETAIL_TOO_LONG: `詳細は${TODO_VALIDATION.DETAIL_MAX_LENGTH}文字以内で入力してください`,
  DUE_DATE_INVALID_FORMAT: '期限はYYYY-MM-DD形式で入力してください',
  DUE_DATE_PAST: '期限は今日以降の日付を選択してください',
} as const
