import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TaskCard from './TaskCard';
import { TaskType, ContentBlock } from '../types';

// Mock TaskType for testing
const mockTask: TaskType = {
  id: '1',
  title: 'Test Task',
  content: [
    { id: '1-1', type: 'subitem', text: 'Subitem 1', completed: true, children: [] },
    { id: '1-2', type: 'subitem', text: 'Subitem 2', completed: false, children: [
        { id: '1-2-1', type: 'subitem', text: 'Nested Subitem', completed: true, children: [] }
    ]},
    { id: '1-3', type: 'text', text: 'Just a text block' },
  ],
  priority: 'high',
  dueDate: '2024-08-15',
  category: 'Testing',
  archived: false,
};

// Extracted countSubItems function for direct testing
const countSubItems = (items: ContentBlock[]): { total: number; completed: number } => {
    let total = 0;
    let completed = 0;
    for (const item of items) {
        if (item.type === 'subitem') {
            total++;
            if (item.completed) completed++;
            const childrenCount = countSubItems(item.children);
            total += childrenCount.total;
            completed += childrenCount.completed;
        }
    }
    return { total, completed };
};

describe('countSubItems', () => {
  it('should return { total: 0, completed: 0 } for no items', () => {
    expect(countSubItems([])).toEqual({ total: 0, completed: 0 });
  });

  it('should correctly count subitems at the root level', () => {
    const items: ContentBlock[] = [
      { id: '1', type: 'subitem', text: 'A', completed: true, children: [] },
      { id: '2', type: 'subitem', text: 'B', completed: false, children: [] },
      { id: '3', type: 'text', text: 'C' },
    ];
    expect(countSubItems(items)).toEqual({ total: 2, completed: 1 });
  });

  it('should correctly count nested subitems', () => {
    const items: ContentBlock[] = [
      { id: '1', type: 'subitem', text: 'A', completed: true, children: [
        { id: '1-1', type: 'subitem', text: 'A1', completed: false, children: [] },
        { id: '1-2', type: 'subitem', text: 'A2', completed: true, children: [] },
      ]},
      { id: '2', type: 'subitem', text: 'B', completed: false, children: [] },
    ];
    expect(countSubItems(items)).toEqual({ total: 4, completed: 2 });
  });

  it('should handle deeply nested subitems', () => {
    const items: ContentBlock[] = [
      { id: '1', type: 'subitem', text: 'A', completed: false, children: [
        { id: '1-1', type: 'subitem', text: 'A1', completed: true, children: [
          { id: '1-1-1', type: 'subitem', text: 'A1a', completed: true, children: [] },
        ]},
      ]},
    ];
    expect(countSubItems(items)).toEqual({ total: 3, completed: 2 });
  });
});

describe('TaskCard', () => {
  it('should render the task title and content', () => {
    render(
      <TaskCard
        task={mockTask}
        onUpdateTitle={vi.fn()}
        onDeleteTask={vi.fn()}
        onAddBlock={vi.fn()}
        onUpdateBlock={vi.fn()}
        onDeleteBlock={vi.fn()}
        onToggleSubItem={vi.fn()}
        onAddNestedSubItem={vi.fn()}
        onUpdateDetails={vi.fn()}
        onToggleArchive={vi.fn()}
        onMoveBlock={vi.fn()}
      />
    );

    // Check if the title is rendered
    expect(screen.getByText('Test Task')).toBeInTheDocument();

    // Check if subitems are rendered
    expect(screen.getByText('Subitem 1')).toBeInTheDocument();
    expect(screen.getByText('Subitem 2')).toBeInTheDocument();
    expect(screen.getByText('Nested Subitem')).toBeInTheDocument();

    // Check if the text block is rendered
    expect(screen.getByText('Just a text block')).toBeInTheDocument();
  });

  it('should display the correct progress for subitems', () => {
    render(
      <TaskCard
        task={mockTask}
        onUpdateTitle={vi.fn()}
        onDeleteTask={vi.fn()}
        onAddBlock={vi.fn()}
        onUpdateBlock={vi.fn()}
        onDeleteBlock={vi.fn()}
        onToggleSubItem={vi.fn()}
        onAddNestedSubItem={vi.fn()}
        onUpdateDetails={vi.fn()}
        onToggleArchive={vi.fn()}
        onMoveBlock={vi.fn()}
      />
    );

    // 2 of 3 subitems are complete
    const progress = (2 / 3) * 100;
    const progressBar = screen.getByRole('progressbar');
    const progressBarInner = progressBar.firstChild as HTMLElement;
    expect(progressBarInner).toHaveStyle(`width: ${progress}%`);
  });
});