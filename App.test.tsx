
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import App from './App';

describe('App', () => {
  it("should update the parent item's status to completed when all subitems are checked", async () => {
    // Mock initial tasks with a nested structure
    const initialTasks = [
      {
        id: '1',
        title: 'Parent Task',
        content: [
          {
            id: '1-1',
            type: 'subitem',
            text: 'Subitem 1',
            completed: false,
            children: [
              {
                id: '1-1-1',
                type: 'subitem',
                text: 'Nested Subitem 1',
                completed: false,
                children: [],
              },
            ],
          },
          {
            id: '1-2',
            type: 'subitem',
            text: 'Subitem 2',
            completed: false,
            children: [],
          },
        ],
        priority: 'high',
        dueDate: '2024-08-15',
        category: 'Acadêmico',
        archived: false,
        color: '#581c1c',
      },
    ];

    render(<App initialTasks={initialTasks} />);

    // Get the "Continuar como convidado" button and click it
    const guestButton = screen.getByText('Continuar como convidado');
    fireEvent.click(guestButton);

    // Wait for an element that is unique to the checklist view
    await screen.findByText('Ativas');

    // Get all checkboxes
    const checkboxes = await screen.findAllByRole('checkbox');

    // Check all subitems
    for (const checkbox of checkboxes) {
      if (!(checkbox as HTMLInputElement).checked) {
        fireEvent.click(checkbox);
      }
    }

    // Assert that the parent item's checkbox is checked
    const parentCheckbox = checkboxes[0] as HTMLInputElement;
    expect(parentCheckbox.checked).toBe(true);
  });
});
