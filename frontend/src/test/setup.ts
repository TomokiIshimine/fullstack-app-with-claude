import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Bypass HTML5 form validation in tests to allow testing JavaScript validation
beforeAll(() => {
  // Mock reportValidity to always return true
  HTMLFormElement.prototype.reportValidity = function () {
    return true
  }

  // Mock checkValidity to always return true
  HTMLFormElement.prototype.checkValidity = function () {
    return true
  }
})
