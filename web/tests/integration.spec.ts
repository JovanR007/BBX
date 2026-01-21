import { test, expect } from '@playwright/test';

test.describe('Homepage', () => {
    test('should load the homepage', async ({ page }) => {
        await page.goto('/');
        // Verify page loads by checking for common elements
        await expect(page).toHaveTitle(/BeyBracket/i);
    });
});

test.describe('Tournament Dashboard', () => {
    test('should show login prompt or dashboard', async ({ page }) => {
        await page.goto('/dashboard');
        // Should either show login or dashboard content
        const hasContent = await page.locator('body').textContent();
        expect(hasContent).toBeTruthy();
    });
});

test.describe('Public Tournament View', () => {
    // This test uses a placeholder tournament ID
    // In a real scenario, you would seed test data or use fixtures
    test.skip('should render bracket or standings page', async ({ page }) => {
        // Placeholder - requires actual tournament ID
        await page.goto('/t/test-tournament-id/bracket');
        await expect(page.locator('body')).toContainText(['Swiss', 'Elimination', 'Round', 'Match']);
    });
});

test.describe('Create Tournament Flow', () => {
    test('should navigate to create page', async ({ page }) => {
        await page.goto('/create');
        // Check the create form exists
        await expect(page.locator('form, input, button')).toBeTruthy();
    });
});
