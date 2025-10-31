import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TextBlock from './TextBlock';
import { TextBlock as TextBlockType } from '../types';

// Mock TextBlock component to isolate parseMarkdown
const mockTextBlock: TextBlockType = {
  id: '1',
  type: 'text',
  text: 'Hello, world!',
};

// Extracted parseMarkdown function for direct testing
const parseMarkdown = (text: string): string => {
  const lines = text.split('\n');
  let html = '';
  let inUList = false;
  let inOList = false;

  for (const line of lines) {
    if (!line.match(/^\s*[-*] /) && inUList) {
      html += '</ul>\n';
      inUList = false;
    }
    if (!line.match(/^\s*\d+\. /) && inOList) {
      html += '</ol>\n';
      inOList = false;
    }

    if (line.startsWith('### ')) {
      html += `<h3>${line.substring(4)}</h3>\n`;
    } else if (line.startsWith('## ')) {
      html += `<h2>${line.substring(3)}</h2>\n`;
    } else if (line.startsWith('# ')) {
      html += `<h1>${line.substring(2)}</h1>\n`;
    } else if (line.startsWith('> ')) {
      html += `<blockquote>${line.substring(2)}</blockquote>\n`;
    } else if (line.match(/^\s*[-*] /)) {
      if (!inUList) {
        html += '<ul>\n';
        inUList = true;
      }
      html += `<li>${line.replace(/^\s*[-*] /, '')}</li>\n`;
    } else if (line.match(/^\s*\d+\. /)) {
      if (!inOList) {
        html += '<ol>\n';
        inOList = true;
      }
      html += `<li>${line.replace(/^\s*\d+\. /, '')}</li>\n`;
    } else {
      html += `<p>${line}</p>\n`;
    }
  }

  if (inUList) html += '</ul>\n';
  if (inOList) html += '</ol>\n';

  return html
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>');
};

describe('parseMarkdown', () => {
  it('should correctly parse markdown headings', () => {
    expect(parseMarkdown('# Header 1')).toBe('<h1>Header 1</h1>\n');
    expect(parseMarkdown('## Header 2')).toBe('<h2>Header 2</h2>\n');
    expect(parseMarkdown('### Header 3')).toBe('<h3>Header 3</h3>\n');
  });

  it('should correctly parse bold and italic text', () => {
    expect(parseMarkdown('**bold**')).toBe('<p><strong>bold</strong></p>\n');
    expect(parseMarkdown('*italic*')).toBe('<p><em>italic</em></p>\n');
    expect(parseMarkdown('__bold__')).toBe('<p><strong>bold</strong></p>\n');
    expect(parseMarkdown('_italic_')).toBe('<p><em>italic</em></p>\n');
    expect(parseMarkdown('~~strike~~')).toBe('<p><del>strike</del></p>\n');
  });

  it('should correctly parse unordered lists', () => {
    const markdown = '- Item 1\n- Item 2';
    const expectedHtml = '<ul>\n<li>Item 1</li>\n<li>Item 2</li>\n</ul>\n';
    expect(parseMarkdown(markdown)).toBe(expectedHtml);
  });

  it('should correctly parse ordered lists', () => {
    const markdown = '1. First\n2. Second';
    const expectedHtml = '<ol>\n<li>First</li>\n<li>Second</li>\n</ol>\n';
    expect(parseMarkdown(markdown)).toBe(expectedHtml);
  });

  it('should correctly parse blockquotes', () => {
    expect(parseMarkdown('> A quote')).toBe('<blockquote>A quote</blockquote>\n');
  });

  it('should handle mixed content correctly', () => {
    const markdown = '# Title\n- **Item 1**\n- *Item 2*\n\n> A quote';
    const expectedHtml = '<h1>Title</h1>\n<ul>\n<li><strong>Item 1</strong></li>\n<li><em>Item 2</em></li>\n</ul>\n<p></p>\n<blockquote>A quote</blockquote>\n';
    expect(parseMarkdown(markdown)).toBe(expectedHtml);
  });
});

describe('TextBlock', () => {
  it('should render the parsed markdown', () => {
    const block: TextBlockType = {
      id: 'test-block',
      type: 'text',
      text: '# Hello\n- List item',
    };
    render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onDelete={vi.fn()}
        onMoveBlock={vi.fn()}
      />
    );

    const renderedHtml = screen.getByRole('heading', { level: 1 });
    expect(renderedHtml.innerHTML).toBe('Hello');

    const listItem = screen.getByText('List item');
    expect(listItem.tagName).toBe('LI');
  });
});